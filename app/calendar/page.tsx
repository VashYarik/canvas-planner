import { prisma } from '@/lib/prisma';
import Calendar from '@/app/components/Calendar';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';
import { getDbUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
    const user = await getDbUser();
    if (!user) {
        redirect('/sign-in');
    }

    // Fetch tasks and blocks for a reasonable window (e.g., this month)
    // For simplicity, we fetch all active planned items for now.

    const tasks = await prisma.task.findMany({
        where: {
            userId: user.id,
            // Include status: 'done' tasks so they are shown in the calendar crossed out
            dueAt: { not: null }
        },
        include: { course: true }
    });

    const workBlocks = await prisma.workBlock.findMany({
        where: {
            userId: user.id,
            status: { in: ['planned', 'done'] }
        },
        include: {
            task: {
                include: { course: true }
            }
        }
    });

    const classPeriods = await prisma.classPeriod.findMany({
        where: {
            course: {
                userId: user.id
            }
        },
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
        course: t.course ? { code: t.course.code, color: t.course.color } : undefined
    }));

    const serializableBlocks = workBlocks.map(b => ({
        ...b,
        startAt: b.startAt.toISOString(),
        task: {
            id: b.task.id,
            title: b.task.title,
            dueAt: b.task.dueAt ? b.task.dueAt.toISOString() : undefined,
            course: b.task.course ? { code: b.task.course.code, color: b.task.course.color } : undefined,
            status: b.task.status
        }
    }));

    return (
        <div className="h-full flex flex-col font-sans-dm text-text-gentle">
            <Calendar
                tasks={serializableTasks}
                workBlocks={serializableBlocks}
                classPeriods={classPeriods}
            />
        </div>
    );
}
