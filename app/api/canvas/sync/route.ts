import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listCourses, listAssignments, CanvasAssignment } from '@/lib/canvas_api';

export async function POST() {
    try {
        // 1. Fetch Requesting User
        let user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'No user found' }, { status: 404 });
        }

        // 2. Sync Courses
        console.log('Fetching courses from Canvas...');
        let token = user.canvasAccessToken;

        // If no user token, check env (legacy/global mode)
        if (!token) {
            token = process.env.CANVAS_ACCESS_TOKEN;
            if (token) console.log('Using global CANVAS_ACCESS_TOKEN from env');
        }

        if (!token) {
            return NextResponse.json({ error: 'Not connected to Canvas. Please connect in Settings.' }, { status: 401 });
        }

        const canvasCourses = await listCourses(token);
        console.log(`Found ${canvasCourses.length} courses.`);

        let syncedCoursesCount = 0;
        let syncedAssignmentsCount = 0;

        for (const c of canvasCourses) {
            // Upsert course
            let course = await prisma.course.findFirst({
                where: {
                    userId: user.id,
                    sourceId: c.id.toString()
                }
            });

            if (!course) {
                // Try by code if sourceId missing (legacy)
                course = await prisma.course.findFirst({
                    where: {
                        userId: user.id,
                        code: c.course_code
                    }
                });
            }

            if (course) {
                // Update sourceId if missing, and update dates
                const updateData: any = {};
                if (course.sourceId !== c.id.toString()) updateData.sourceId = c.id.toString();

                // Always update dates if available from Canvas
                if (c.start_at) updateData.startDate = new Date(c.start_at);
                if (c.end_at) updateData.endDate = new Date(c.end_at);

                if (Object.keys(updateData).length > 0) {
                    course = await prisma.course.update({
                        where: { id: course.id },
                        data: updateData
                    });
                }
            } else {
                course = await prisma.course.create({
                    data: {
                        userId: user.id,
                        name: c.name,
                        code: c.course_code,
                        sourceId: c.id.toString(),
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                        startDate: c.start_at ? new Date(c.start_at) : null,
                        endDate: c.end_at ? new Date(c.end_at) : null
                    }
                });
                syncedCoursesCount++;
            }

            // 3. Sync Assignments for this course
            console.log(`Fetching assignments for course ${c.name} (${c.id})...`);
            try {
                const assignments = await listAssignments(c.id, token);
                const now = new Date();
                const fiveDaysAgo = new Date(now.setDate(now.getDate() - 5));

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
            assignmentsSynced: syncedAssignmentsCount
        });

    } catch (error: any) {
        console.error('Canvas Sync Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync'
        }, { status: 500 });
    }
}

async function upsertAssignment(userId: string, courseId: string, a: CanvasAssignment) {
    // Check if task exists by sourceId
    const existing = await prisma.task.findFirst({
        where: {
            userId,
            source: 'canvas',
            sourceId: a.id.toString()
        }
    });

    const data = {
        title: a.name,
        description: a.description || '', // might want to strip HTML
        dueAt: a.due_at ? new Date(a.due_at) : null,
        points: a.points_possible,
        courseId: courseId,
        // Don't overwrite status if user changed it? 
        // For MVP, leave status alone if exists, "todo" if new.
    };

    if (existing) {
        // Update fields but respect user edits?
        // User requirements: "If user set estimatedMinutes, don’t overwrite". 
        // "If user changed difficulty, don’t overwrite".
        // OK to update title, dueAt, points Description.
        await prisma.task.update({
            where: { id: existing.id },
            data: data
        });
    } else {
        await prisma.task.create({
            data: {
                ...data,
                user: { connect: { id: userId } },
                source: 'canvas',
                sourceId: a.id.toString(),
                status: 'todo',
                // Remove courseId from scalar, use connect
                course: { connect: { id: courseId } },
                courseId: undefined // ensure scalar is not passed
            }
        });
    }
}
