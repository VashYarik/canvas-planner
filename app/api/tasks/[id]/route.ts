import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tasks/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const task = await prisma.task.findUnique({
            where: { id },
            include: { course: true, workBlocks: true }
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        return NextResponse.json(task);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
    }
}

// PATCH /api/tasks/[id] - Update task
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const task = await prisma.task.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
                status: body.status,
                estimatedMinutes: body.estimatedMinutes ? parseInt(body.estimatedMinutes) : undefined,
                needsWorkBlocks: body.needsWorkBlocks
            }
        });

        // Sync WorkBlocks: If task is marked as done, mark all PLANNED blocks as done
        if (body.status === 'done') {
            await prisma.workBlock.updateMany({
                where: { taskId: id, status: 'planned' },
                data: { status: 'done' }
            });
        }
        // If task is re-opened (todo/in-progress), mark blocks back to planned
        // so they reappear as not completed in the calendar.
        else if (body.status === 'todo' || body.status === 'in-progress') {
            await prisma.workBlock.updateMany({
                where: { taskId: id, status: 'done' },
                data: { status: 'planned' }
            });
        }

        return NextResponse.json(task);
    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Delete related work blocks first (cascade should handle this if configured, but safe to be explicit)
        await prisma.workBlock.deleteMany({
            where: { taskId: id }
        });

        await prisma.task.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
