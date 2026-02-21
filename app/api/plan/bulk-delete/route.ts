
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const BulkDeleteSchema = z.object({
    ids: z.array(z.string())
});

export async function POST(req: Request) {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        const { ids } = BulkDeleteSchema.parse(body);

        if (ids.length === 0) {
            return NextResponse.json({ success: true, count: 0 });
        }

        const blocksToDelete = await prisma.workBlock.findMany({
            where: {
                id: { in: ids },
                userId: user.id
            },
            include: { task: true }
        });

        // Group by taskId and sum durationMinutes
        const taskReductions: Record<string, number> = {};
        for (const block of blocksToDelete) {
            if (block.task.estimatedMinutes !== null) {
                taskReductions[block.taskId] = (taskReductions[block.taskId] || 0) + block.durationMinutes;
            }
        }

        // Update tasks
        for (const taskId in taskReductions) {
            const task = await prisma.task.findUnique({ where: { id: taskId } });
            if (task && task.estimatedMinutes !== null) {
                const newEstimate = Math.max(0, task.estimatedMinutes - taskReductions[taskId]);
                await prisma.task.update({
                    where: { id: taskId },
                    data: { estimatedMinutes: newEstimate }
                });
            }
        }

        // Delete blocks matching IDs and User (security check)
        const result = await prisma.workBlock.deleteMany({
            where: {
                id: { in: ids },
                userId: user.id
            }
        });

        return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
        console.error('Bulk Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
