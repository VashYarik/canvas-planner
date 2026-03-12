import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listCourses } from '@/lib/canvas_api';
import { getDbUser } from '@/lib/auth';

export async function POST() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Courses from Canvas
        console.log('Fetching courses from Canvas...');
        // TODO: Pass user.id or canvas token to listCourses if it starts taking it per-user
        const canvasCourses = await listCourses(user.id);
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
                const sourceIdStr = c.id.toString();
                const PALETTE = ['#737883', '#86919D', '#B9BABD', '#F1F0EE', '#E8DED1', '#BE9E82'];
                let hash = 0;
                for (let i = 0; i < sourceIdStr.length; i++) hash = sourceIdStr.charCodeAt(i) + ((hash << 5) - hash);
                const color = PALETTE[Math.abs(hash) % PALETTE.length];

                const newCourse = await prisma.course.create({
                    data: {
                        userId: user.id,
                        name: c.name,
                        code: c.course_code,
                        sourceId: sourceIdStr,
                        color: color
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
