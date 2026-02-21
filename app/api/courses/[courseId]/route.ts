
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateCourseSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    color: z.string().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    schedule: z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        location: z.string().optional().nullable(),
    })).optional()
});

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const body = await req.json();
        const data = UpdateCourseSchema.parse(body);
        const { courseId } = await params;

        // Verify course exists
        const existingCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: { classPeriods: true }
        });

        if (!existingCourse) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Update Course Details
        const updatedCourse = await prisma.course.update({
            where: { id: courseId },
            data: {
                name: data.name,
                code: data.code,
                color: data.color,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
            }
        });

        // Update Schedule: Delete existing and recreate
        // This is simpler than differencing for now
        if (data.schedule) {
            await prisma.$transaction([
                prisma.classPeriod.deleteMany({
                    where: { courseId: courseId }
                }),
                prisma.classPeriod.createMany({
                    data: data.schedule.map(period => ({
                        courseId: courseId,
                        dayOfWeek: period.dayOfWeek,
                        startTime: period.startTime,
                        endTime: period.endTime,
                        location: period.location || null
                    }))
                })
            ]);
        }

        return NextResponse.json({ success: true, course: updatedCourse });

    } catch (error: any) {
        console.error('Update Course Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { courseId } = await params;

        // Manually delete related records if Cascade isn't working/setup
        await prisma.$transaction([
            prisma.workBlock.deleteMany({
                where: {
                    task: {
                        courseId: courseId
                    }
                }
            }),
            prisma.task.deleteMany({
                where: { courseId: courseId }
            }),
            prisma.classPeriod.deleteMany({
                where: { courseId: courseId }
            }),
            prisma.course.delete({
                where: { id: courseId }
            })
        ]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete Course Error:', error);
        // Log deep details if available
        if (error instanceof Error) {
            console.error(error.stack);
        }
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
