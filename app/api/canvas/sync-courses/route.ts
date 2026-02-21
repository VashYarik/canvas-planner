import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listCourses } from '@/lib/canvas_api';

export async function POST() {
    try {
        // 1. Fetch Requesting User (Mock for MVP)
        let user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'No user found' }, { status: 404 });
        }

        // 2. Fetch Courses from Canvas
        console.log('Fetching courses from Canvas...');
        const canvasCourses = await listCourses();
        console.log(`Found ${canvasCourses.length} courses.`);

        // 3. Sync to DB
        const syncedCourses = [];
        for (const c of canvasCourses) {
            // Upsert course
            // Using course code + userId as a quasi-unique constraint or just Canvas ID?
            // The DB schema doesn't have a "sourceId" for Course, only for Task.
            // I should probably add source/sourceId to Course or just use name match.
            // For MVP, checking by name and userId.

            const existing = await prisma.course.findFirst({
                where: {
                    userId: user.id,
                    // Ideal: sourceId: c.id.toString() (but schema doesn't have it yet)
                    code: c.course_code
                }
            });

            if (existing) {
                syncedCourses.push(existing);
            } else {
                const newCourse = await prisma.course.create({
                    data: {
                        userId: user.id,
                        name: c.name,
                        code: c.course_code,
                        // Random color generator could go here
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
                    }
                });
                syncedCourses.push(newCourse);
            }
        }

        return NextResponse.json({
            success: true,
            count: syncedCourses.length,
            courses: syncedCourses
        });

    } catch (error: any) {
        console.error('Canvas Sync Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync courses'
        }, { status: 500 });
    }
}
