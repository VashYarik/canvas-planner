import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDbUser } from '@/lib/auth';

// GET /api/tasks - List all tasks
export async function GET() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tasks = await prisma.task.findMany({
            where: { userId: user.id },
            orderBy: [
                { dueAt: 'asc' }, // nulls last? Prisma sorts nulls depends on DB, usually first/last. We handle logic later.
                { createdAt: 'desc' }
            ],
            include: {
                course: true,
                workBlocks: {
                    where: { status: 'planned' },
                    orderBy: { startAt: 'asc' },
                    take: 1
                }
            }
        });
        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title, courseId, dueAt, estimatedMinutes, difficulty, description, needsWorkBlocks } = body;

        // Attempt to find the course if provided
        let targetCourseId = courseId || null;

        const taskData: any = {
            user: { connect: { id: user.id } },
            source: 'manual',
            title,
            description: description || null,
            dueAt: dueAt ? new Date(dueAt) : null,
            estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes as string) : null,
            difficulty,
            needsWorkBlocks: needsWorkBlocks ?? true,
            status: 'todo',
        };

        if (targetCourseId) {
            taskData.course = { connect: { id: targetCourseId } };
        }

        const task = await prisma.task.create({
            data: taskData,
        });

        return NextResponse.json(task, { status: 201 });
    } catch (error) {
        console.error('Failed to create task:', error);
        return NextResponse.json({ error: 'Failed to create task', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

// DELETE /api/tasks - Clear all tasks for current user
export async function DELETE() {
    try {
        const user = await getDbUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.task.deleteMany({
            where: { userId: user.id }
        });
        return NextResponse.json({ message: 'All tasks deleted' });
    } catch (error) {
        console.error('Failed to delete tasks:', error);
        return NextResponse.json({ error: 'Failed to delete tasks' }, { status: 500 });
    }
}
