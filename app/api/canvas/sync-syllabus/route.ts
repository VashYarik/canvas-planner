import { NextResponse } from 'next/server';
import { listCourses, listAssignments, CanvasAssignment } from '@/lib/canvas_api';
import { prisma } from '@/lib/prisma';


export async function POST() {
    try {
        const courses = await listCourses();
        const user = await prisma.user.findFirst(); // Assuming single user for now

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const results = [];

        for (const canvasCourse of courses) {
            // Find or create the course in our DB
            let course = await prisma.course.findFirst({
                where: { sourceId: String(canvasCourse.id) }
            });

            if (!course) {
                course = await prisma.course.create({
                    data: {
                        userId: user.id,
                        name: canvasCourse.name,
                        code: canvasCourse.course_code,
                        sourceId: String(canvasCourse.id),
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
                        syllabus: canvasCourse.syllabus_body || null, // Store syllabus
                        startDate: canvasCourse.start_at ? new Date(canvasCourse.start_at) : null,
                        endDate: canvasCourse.end_at ? new Date(canvasCourse.end_at) : null
                    }
                });
            } else {
                // Update syllabus if it changed, and dates
                await prisma.course.update({
                    where: { id: course.id },
                    data: {
                        syllabus: canvasCourse.syllabus_body || null,
                        startDate: canvasCourse.start_at ? new Date(canvasCourse.start_at) : null,
                        endDate: canvasCourse.end_at ? new Date(canvasCourse.end_at) : null
                    }
                });
            }

            // REMOVED: 1. Clear existing generic class periods to avoid duplicates on re-sync
            // This was deleting manual schedules. We should rely on manual edits for now or intelligent diffing.
            // await prisma.classPeriod.deleteMany({
            //    where: { courseId: course.id }
            // });

            // 2. Fetch Assignments from Canvas API (The "Gold Standard" for assignments)
            console.log(`[Sync] Fetching API assignments for ${course.name}...`);
            let apiAssignments: CanvasAssignment[] = [];
            try {
                apiAssignments = await listAssignments(course.id);
                for (const a of apiAssignments) {
                    await upsertAssignment(user.id, course.id, a);
                }
            } catch (err) {
                console.error(`[Sync] Failed to fetch API assignments for ${course.name}`, err);
            }

            // 3. (REMOVED) Extract Schedule and Additional Dates from Aggregated Context (AI)
            // User requested to remove AI syllabus syncing.

            results.push({
                course: course.name,
                apiAssignments: apiAssignments.length
            });
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Sync Syllabus Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
async function upsertAssignment(userId: string, courseId: string, a: CanvasAssignment) {
    const existing = await prisma.task.findFirst({
        where: {
            userId,
            source: 'canvas',
            sourceId: a.id.toString()
        }
    });

    const data = {
        title: a.name,
        // description: a.description, // HTML too long?
        dueAt: a.due_at ? new Date(a.due_at) : null,
        points: a.points_possible,
        courseId: courseId,
    };

    if (existing) {
        await prisma.task.update({
            where: { id: existing.id },
            data: data
        });
    } else {
        await prisma.task.create({
            data: {
                ...data,
                userId,
                source: 'canvas',
                sourceId: a.id.toString(),
                status: 'todo',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
    }
}
