import { prisma } from '@/lib/prisma';
import Calendar from '@/app/components/Calendar';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
    // Fetch tasks and blocks for a reasonable window (e.g., this month)
    // For simplicity, we fetch all active planned items for now.

    const tasks = await prisma.task.findMany({
        where: {
            // Include status: 'done' tasks so they are shown in the calendar crossed out
            dueAt: { not: null }
        },
        include: { course: true }
    });

    const workBlocks = await prisma.workBlock.findMany({
        where: {
            status: { in: ['planned', 'done'] }
        },
        include: {
            task: {
                include: { course: true }
            }
        }
    });

    const classPeriods = await prisma.classPeriod.findMany({
        include: {
            course: true
        }
    });

    // Serialize dates to strings for Client Component
    const serializableTasks = tasks.map(t => ({
        ...t,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        points: t.points,
        description: t.description,
        status: t.status,
        estimatedMinutes: t.estimatedMinutes,
        course: t.course ? { color: t.course.color } : undefined
    }));

    const serializableBlocks = workBlocks.map(b => ({
        ...b,
        startAt: b.startAt.toISOString(),
        task: {
            id: b.task.id,
            title: b.task.title,
            dueAt: b.task.dueAt ? b.task.dueAt.toISOString() : undefined,
            course: b.task.course ? { color: b.task.course.color } : undefined,
            status: b.task.status
        }
    }));

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Calendar</h1>
            <Calendar
                tasks={serializableTasks}
                workBlocks={serializableBlocks}
                classPeriods={classPeriods}
            />
        </div >
    );
}
