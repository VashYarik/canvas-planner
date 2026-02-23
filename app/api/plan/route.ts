import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';
import { getDbUser } from '@/lib/auth';

export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        // Just fetch all future/recent planned blocks
        const blocks = await prisma.workBlock.findMany({
            where: {
                userId: user.id,
                // status: 'planned' // Include done too?
            },
            include: {
                task: {
                    include: { course: true }
                }
            },
            orderBy: { startAt: 'asc' }
        });

        return NextResponse.json(blocks);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fully wipe user's SCEDULE (Calendar items) but keep DATA (Tasks/Courses)
        await prisma.$transaction([
            // 1. Delete all WorkBlocks (Planned Work)
            prisma.workBlock.deleteMany({
                where: { userId: user.id }
            }),

            // 2. Delete all ClassPeriods (Course Schedule on Calendar)
            // We need to find courses for this user to delete their class periods
            // Since we can't deleteMany on related field directly easily without many-to-many or specific support
        ]);

        const courses = await prisma.course.findMany({
            where: { userId: user.id },
            select: { id: true }
        });

        const courseIds = courses.map(c => c.id);

        if (courseIds.length > 0) {
            await prisma.classPeriod.deleteMany({
                where: { courseId: { in: courseIds } }
            });
        }

        return NextResponse.json({ success: true });


    } catch (error: any) {
        console.error('Clear Plan Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
