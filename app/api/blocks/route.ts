import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbUser } from '@/lib/auth';

// POST /api/blocks - Create a new work block manually
export async function POST(request: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { taskId, startAt, durationMinutes } = body;

        if (!taskId || !startAt || !durationMinutes) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const taskInfo = await prisma.task.findUnique({
            where: { id: taskId },
            select: { userId: true, estimatedMinutes: true }
        });

        if (!taskInfo || taskInfo.userId !== user.id) {
            return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
        }

        // Create the localized workblock, defaulting to locked since it's user-placed
        const block = await prisma.workBlock.create({
            data: {
                taskId,
                userId: user.id, // verified user
                startAt: new Date(startAt),
                durationMinutes: parseInt(durationMinutes),
                kind: 'work',
                status: 'planned',
                isLocked: true
            },
            include: {
                task: {
                    select: { id: true, title: true, course: true, estimatedMinutes: true }
                }
            }
        });

        // If the task had an estimated time, dynamically pad it so this new block doesn't just eat into the existing estimate.
        if (taskInfo.estimatedMinutes !== null) {
            await prisma.task.update({
                where: { id: taskId },
                data: {
                    estimatedMinutes: taskInfo.estimatedMinutes + parseInt(durationMinutes)
                }
            });
        }

        return NextResponse.json(block);
    } catch (error) {
        console.error('Create Block Error:', error);
        return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    }
}
