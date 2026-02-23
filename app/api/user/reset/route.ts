import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbUser } from '@/lib/auth';

export async function POST() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // We use a transaction to ensure all or nothing deletion
        await prisma.$transaction(async (tx) => {
            // 1. Delete all WorkBlocks
            await tx.workBlock.deleteMany({
                where: { userId: user.id }
            });

            // 2. Delete all Tasks
            await tx.task.deleteMany({
                where: { userId: user.id }
            });

            // 3. Delete ClassPeriods (via Course IDs)
            const userCourses = await tx.course.findMany({
                where: { userId: user.id },
                select: { id: true }
            });
            const courseIds = userCourses.map(c => c.id);
            if (courseIds.length > 0) {
                await tx.classPeriod.deleteMany({
                    where: { courseId: { in: courseIds } }
                });
            }

            // 4. Delete all Courses
            await tx.course.deleteMany({
                where: { userId: user.id }
            });

            // 5. Delete all AvailabilityBlocks
            await tx.availabilityBlock.deleteMany({
                where: { userId: user.id }
            });

            // 6. Reset User record
            await tx.user.update({
                where: { id: user.id },
                data: {
                    canvasAccessToken: null,
                    canvasRefreshToken: null,
                    canvasTokenExpiresAt: null,
                    preferences: '{}',
                    maxDailyWorkMinutes: 150,
                    preferredBlockMinutes: 60,
                    noWorkAfter: '22:00',
                    workDays: '[false, true, true, true, true, true, false]', // Default Mon-Fri
                    timezone: 'America/New_York'
                }
            });
        });

        return NextResponse.json({ success: true, message: 'Account successfully reset to defaults.' });

    } catch (error: any) {
        console.error('Account reset error:', error);
        return NextResponse.json({ error: error.message || 'Failed to reset account' }, { status: 500 });
    }
}
