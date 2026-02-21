import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/blocks/[id] - Update work block
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const currentBlock = await prisma.workBlock.findUnique({ where: { id } });
        if (!currentBlock) return NextResponse.json({ error: 'Block not found' }, { status: 404 });

        let newStart = body.startAt ? new Date(body.startAt) : currentBlock.startAt;
        let newDuration = body.durationMinutes !== undefined ? parseInt(body.durationMinutes) : currentBlock.durationMinutes;

        // Auto-merge touching blocks of the same task
        const otherBlocks = await prisma.workBlock.findMany({
            where: {
                taskId: currentBlock.taskId,
                id: { not: id }
            }
        });

        let minStart = newStart.getTime();
        let maxEnd = newStart.getTime() + newDuration * 60000;
        let mergedBlockIds = new Set<string>();
        let merged;

        do {
            merged = false;
            for (const b of otherBlocks) {
                if (mergedBlockIds.has(b.id)) continue;
                const bStart = b.startAt.getTime();
                const bEnd = bStart + b.durationMinutes * 60000;

                // If they touch, overlap, or are within 15 mins of each other
                const GAP_TOLERANCE_MS = 15 * 60000;
                if (Math.max(bStart, minStart) <= Math.min(bEnd, maxEnd) + GAP_TOLERANCE_MS) {
                    minStart = Math.min(minStart, bStart);
                    maxEnd = Math.max(maxEnd, bEnd);
                    mergedBlockIds.add(b.id);
                    merged = true;
                }
            }
        } while (merged);

        if (mergedBlockIds.size > 0) {
            newStart = new Date(minStart);
            newDuration = Math.round((maxEnd - minStart) / 60000);

            // Delete merged blocks (without degrading task's estimatedMinutes)
            await prisma.workBlock.deleteMany({
                where: { id: { in: Array.from(mergedBlockIds) } }
            });
        }

        const block = await prisma.workBlock.update({
            where: { id },
            data: {
                startAt: newStart,
                durationMinutes: newDuration,
                isLocked: true
            },
            include: {
                task: {
                    select: { id: true, title: true, course: true }
                }
            }
        });

        return NextResponse.json(block);
    } catch (error) {
        console.error('Update Block Error:', error);
        return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
    }
}

// DELETE /api/blocks/[id] - Delete work block
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const block = await prisma.workBlock.findUnique({
            where: { id },
            include: { task: true }
        });

        if (block && block.task.estimatedMinutes !== null) {
            const newEstimate = Math.max(0, block.task.estimatedMinutes - block.durationMinutes);
            await prisma.task.update({
                where: { id: block.taskId },
                data: { estimatedMinutes: newEstimate }
            });
        }

        await prisma.workBlock.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Block Error:', error);
        return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 });
    }
}
