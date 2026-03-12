import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listCourses, listAssignments, CanvasAssignment } from "@/lib/canvas_api";
import { getDbUser } from "@/lib/auth";

export async function POST() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2) Resolve Canvas token (user token first, then env fallback)
        let token: string | null = user.canvasAccessToken;

        if (!token) {
            token = process.env.CANVAS_ACCESS_TOKEN ?? null;
            if (token) console.log("Using global CANVAS_ACCESS_TOKEN from env");
        }

        if (!token) {
            return NextResponse.json(
                { error: "Not connected to Canvas. Please connect in Settings." },
                { status: 401 }
            );
        }

        // 3) Sync courses
        console.log("Fetching courses from Canvas...");
        const canvasCourses = await listCourses(token);
        console.log(`Found ${canvasCourses.length} courses.`);

        let syncedCoursesCount = 0;
        let syncedAssignmentsCount = 0;

        for (const c of canvasCourses) {
            // Upsert course (by sourceId, fallback by code for legacy)
            let course = await prisma.course.findFirst({
                where: { userId: user.id, sourceId: c.id.toString() },
            });

            if (!course) {
                course = await prisma.course.findFirst({
                    where: { userId: user.id, code: c.course_code },
                });
            }

            if (course) {
                const updateData: Record<string, any> = {};

                // Ensure sourceId is set/updated
                if (course.sourceId !== c.id.toString()) {
                    updateData.sourceId = c.id.toString();
                }

                // Update dates when available
                if (c.start_at) updateData.startDate = new Date(c.start_at);
                if (c.end_at) updateData.endDate = new Date(c.end_at);

                if (Object.keys(updateData).length > 0) {
                    course = await prisma.course.update({
                        where: { id: course.id },
                        data: updateData,
                    });
                }
            } else {
                const sourceIdStr = c.id.toString();
                const PALETTE = ['#737883', '#86919D', '#B9BABD', '#F1F0EE', '#E8DED1', '#BE9E82'];
                let hash = 0;
                for (let i = 0; i < sourceIdStr.length; i++) hash = sourceIdStr.charCodeAt(i) + ((hash << 5) - hash);
                const color = PALETTE[Math.abs(hash) % PALETTE.length];

                course = await prisma.course.create({
                    data: {
                        userId: user.id,
                        name: c.name,
                        code: c.course_code,
                        sourceId: sourceIdStr,
                        color: color,
                        startDate: c.start_at ? new Date(c.start_at) : null,
                        endDate: c.end_at ? new Date(c.end_at) : null,
                    },
                });
                syncedCoursesCount++;
            }

            // 4) Sync assignments for this course
            console.log(`Fetching assignments for course ${c.name} (${c.id})...`);
            try {
                const assignments = await listAssignments(c.id, token);

                const now = new Date();
                const fiveDaysAgo = new Date();
                fiveDaysAgo.setDate(now.getDate() - 5);

                for (const a of assignments) {
                    // Filter out assignments due more than 5 days ago
                    if (a.due_at) {
                        const dueDate = new Date(a.due_at);
                        if (dueDate < fiveDaysAgo) {
                            console.log(`Skipping old assignment: ${a.name} (Due: ${a.due_at})`);
                            continue;
                        }
                    }

                    await upsertAssignment(user.id, course.id, a);
                    syncedAssignmentsCount++;
                }
            } catch (err) {
                console.error(`Failed to fetch assignments for course ${c.id}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            coursesSynced: syncedCoursesCount,
            assignmentsSynced: syncedAssignmentsCount,
        });
    } catch (error: any) {
        console.error("Canvas Sync Error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to sync" },
            { status: 500 }
        );
    }
}

async function upsertAssignment(userId: string, courseId: string, a: CanvasAssignment) {
    const sourceId = a.id.toString();

    // Check if task exists by (userId + source + sourceId)
    const existing = await prisma.task.findFirst({
        where: { userId, source: "canvas", sourceId },
    });

    const data = {
        title: a.name,
        description: a.description || "", // (optional) strip HTML later
        dueAt: a.due_at ? new Date(a.due_at) : null,
        points: a.points_possible,
        // NOTE: Do NOT set courseId scalar here if you use `course: { connect: ... }`
    };

    if (existing) {
        // Update safe fields (keeps user-controlled fields like estimatedMinutes/difficulty intact)
        await prisma.task.update({
            where: { id: existing.id },
            data: {
                ...data,
                course: { connect: { id: courseId } },
            },
        });
    } else {
        await prisma.task.create({
            data: {
                ...data,
                source: "canvas",
                sourceId,
                status: "todo",
                user: { connect: { id: userId } },
                course: { connect: { id: courseId } },
            },
        });
    }
}