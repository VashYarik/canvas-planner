import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getDbUser } from '@/lib/auth';

const CreateCourseSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    color: z.string().optional(),
    startDate: z.string().optional(), // Expect ISO string YYYY-MM-DD
    endDate: z.string().optional(),   // Expect ISO string
    schedule: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM 24h
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        location: z.string().optional().nullable(),
    })).optional()
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = CreateCourseSchema.parse(body);

        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create Course
        const course = await prisma.course.create({
            data: {
                userId: user.id,
                name: data.name,
                code: data.code,
                color: data.color || '#3B82F6',
                // Explicitly cast to Date or null
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                sourceId: `manual_${Date.now()}` // Unique source ID for manual courses
            }
        });

        // Create Class Periods
        if (data.schedule && data.schedule.length > 0) {
            await prisma.classPeriod.createMany({
                data: data.schedule.map(period => ({
                    courseId: course.id,
                    dayOfWeek: period.dayOfWeek,
                    startTime: period.startTime,
                    endTime: period.endTime,
                    location: period.location || null
                }))
            });
        }

        return NextResponse.json({ success: true, course });

    } catch (error: any) {
        console.error('Create Course Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const courses = await prisma.course.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(courses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}
