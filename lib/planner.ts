import { prisma } from '@/lib/prisma';
import { addDays, subDays, startOfDay, endOfDay, isBefore, isAfter, addMinutes, format, parse, getDay, isSameDay } from 'date-fns';
import { estimateTaskDuration } from '@/lib/ai';

function createZonedDate(baseDate: Date, timeStr: string, timeZone: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Extract the local year/month/date for this specific timezone to prevent UTC day shifting
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const [monthStr, dateStr, yearStr] = formatter.format(baseDate).split('/');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const date = Number(dateStr);

    const dummyDate = new Date(Date.UTC(year, month, date, 12, 0, 0));
    const tzString = dummyDate.toLocaleString('en-US', { timeZone, timeZoneName: 'shortOffset' });

    let offset = 'Z';
    const match = tzString.match(/GMT([+-]\d+(:?\d+)?)/);
    if (match) {
        let rawOffset = match[1];
        if (!rawOffset.includes(':')) rawOffset += ':00';
        if (rawOffset.length === 5) rawOffset = rawOffset[0] + '0' + rawOffset.substring(1);
        offset = rawOffset;
    }

    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${offset}`;
    return new Date(isoDate);
}

type TimeSlot = {
    start: Date;
    end: Date;
    availableMinutes: number;
};

export async function generatePlan(userId: string, weekStart: Date, mode: 'reset' | 'update' = 'reset') {
    console.log(`[Planner] Generating plan for user ${userId} starting ${weekStart} (mode: ${mode})`);

    // 1. Fetch Data
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const preferredWorkUnit = user?.preferredBlockMinutes || 60;
    const userTz = user?.timezone || 'America/New_York';

    const tasks = await prisma.task.findMany({
        where: {
            userId,
            status: { not: 'done' },
            dueAt: { not: null },
            needsWorkBlocks: true
        },
        include: { course: true },
        orderBy: { dueAt: 'asc' }
    });

    const availability = await prisma.availabilityBlock.findMany({
        where: { userId }
    });

    // Fetch Class Periods to treat as hard constraints
    const courses = await prisma.course.findMany({
        where: { userId },
        include: { classPeriods: true }
    });

    const classPeriods = courses.flatMap(c => c.classPeriods.map(cp => ({ ...cp, courseStart: c.startDate, courseEnd: c.endDate })));

    const now = new Date();

    let lockedBlocks: any[] = [];
    if (mode === 'update') {
        const rawLockedBlocks = await prisma.workBlock.findMany({
            where: {
                userId,
                status: 'planned',
                isLocked: true
            },
            include: { task: true }
        });

        // Filter out locked blocks that overlap with a class period
        lockedBlocks = rawLockedBlocks.filter((lb: any) => {
            const lbStart = new Date(lb.startAt);
            const lbEnd = addMinutes(lbStart, lb.durationMinutes);
            const dayIndex = getDay(lbStart);

            const hasOverlap = classPeriods.some(cp => {
                if (cp.dayOfWeek !== dayIndex) return false;

                if (cp.courseStart && isBefore(lbStart, startOfDay(cp.courseStart))) return false;
                if (cp.courseEnd && isAfter(lbStart, endOfDay(cp.courseEnd))) return false;

                const cpStartDate = createZonedDate(new Date(lbStart), cp.startTime, userTz);
                const cpEndDate = createZonedDate(new Date(lbStart), cp.endTime, userTz);

                return isBefore(lbStart, cpEndDate) && isAfter(lbEnd, cpStartDate);
            });

            if (hasOverlap) {
                console.log(`[Planner] Locked block for task ${lb.task?.title || lb.taskId} overlaps with class period. Unlocking for reschedule.`);
                return false;
            }
            return true;
        });
    }

    // Clear existing PLANNED blocks for the future AND past (rewrite plan), wiping manual modifications unless updating
    await prisma.workBlock.deleteMany({
        where: {
            userId,
            status: 'planned',
            taskId: { in: tasks.map(t => t.id) }, // Delete ALL planned blocks for active tasks
            id: mode === 'update' ? { notIn: lockedBlocks.map(b => b.id) } : undefined
        }
    });

    // 2. Prepare Slots (Flatten availability into specific Date ranges for the next 7 days)
    let explicitSlots: TimeSlot[] = [];
    for (let i = 0; i < 7; i++) {
        const currentDate = addDays(weekStart, i);
        const dayIndex = getDay(currentDate); // 0 = Sun, 1 = Mon...

        const dayBlocks = availability.filter(b => b.dayOfWeek === dayIndex);
        const dayClasses = classPeriods.filter(cp => {
            if (cp.dayOfWeek !== dayIndex) return false;
            // Check course dates
            if (cp.courseStart && isBefore(currentDate, startOfDay(cp.courseStart))) return false;
            if (cp.courseEnd && isAfter(currentDate, endOfDay(cp.courseEnd))) return false;
            return true;
        });
        const dayLockedBlocks = lockedBlocks.filter(b => isSameDay(b.startAt, currentDate));

        for (const block of dayBlocks) {
            // Parse "18:00" -> Date object
            const start = createZonedDate(currentDate, block.startTime, userTz);
            const end = createZonedDate(currentDate, block.endTime, userTz);

            // Skip if slot is in the past
            if (isBefore(end, now)) continue;

            // If start is in past, clamp to now
            let effectiveStart = isBefore(start, now) ? now : start;
            let effectiveEnd = end;

            // SUBTRACT CLASS PERIODS AND LOCKED BLOCKS
            let currentIntervals = [{ start: effectiveStart, end: effectiveEnd }];

            // Combine exclusions: Classes + Locked Blocks
            const exclusions = [
                ...dayClasses.map(cp => {
                    const s = createZonedDate(currentDate, cp.startTime, userTz);
                    const e = createZonedDate(currentDate, cp.endTime, userTz);
                    return { start: s, end: e };
                }),
                ...dayLockedBlocks.map(lb => {
                    const s = new Date(lb.startAt);
                    const e = addMinutes(s, lb.durationMinutes);
                    return { start: s, end: e };
                })
            ];

            for (const exclusion of exclusions) {
                const nextIntervals = [];
                for (const interval of currentIntervals) {
                    // Check overlap
                    if (isAfter(exclusion.start, interval.end) || isBefore(exclusion.end, interval.start)) {
                        // No overlap, keep interval
                        nextIntervals.push(interval);
                    } else {
                        // Overlap!
                        // 1. Part before exclusion
                        if (isBefore(interval.start, exclusion.start)) {
                            nextIntervals.push({ start: interval.start, end: exclusion.start });
                        }
                        // 2. Part after exclusion
                        if (isAfter(interval.end, exclusion.end)) {
                            nextIntervals.push({ start: exclusion.end, end: interval.end });
                        }
                    }
                }
                currentIntervals = nextIntervals;
            }

            // Convert remaining intervals to slots
            for (const interval of currentIntervals) {
                const duration = (interval.end.getTime() - interval.start.getTime()) / (1000 * 60);
                if (duration > 15) { // Only keep slots > 15 mins
                    explicitSlots.push({
                        start: interval.start,
                        end: interval.end,
                        availableMinutes: duration
                    });
                }
            }
        }
    }

    // Sort slots by time
    explicitSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    // 3. Scheduling Logic - Proportional / Load Balancing
    const workBlocksToCreate = [];

    // Helper: Track utilization per day
    const dailyStats = new Map<number, { capacity: number, used: number, slots: TimeSlot[] }>();

    // Initialize daily stats from explicitSlots
    for (let i = 0; i < 7; i++) {
        // Filter slots for this specific day
        const dayStart = addDays(weekStart, i);
        const slotsForDay = explicitSlots.filter(s => isSameDay(s.start, dayStart));

        const capacity = slotsForDay.reduce((acc, s) => acc + s.availableMinutes, 0);
        dailyStats.set(i, { capacity, used: 0, slots: slotsForDay });
    }

    for (const task of tasks) {
        if (!task.dueAt) continue;
        const due = new Date(task.dueAt);

        let estimatedMin = task.estimatedMinutes;
        if (!estimatedMin) {
            console.log(`[Planner] Estimating duration for task: ${task.title}`);
            const estimate = await estimateTaskDuration(task.title, task.description, task.course?.name);
            estimatedMin = estimate.estimatedMinutes;

            // Persist estimate
            await prisma.task.update({
                where: { id: task.id },
                data: { estimatedMinutes: estimatedMin, difficulty: estimate.difficulty }
            });
        }
        if (!estimatedMin || estimatedMin <= 0) estimatedMin = 60;

        // DEDUCT TIME ALREADY SCHEDULED IN LOCKED BLOCKS FOR THIS TASK (if any exist in this mode)
        const taskLockedBlocks = lockedBlocks.filter(b => b.taskId === task.id);
        const taskLockedMinutes = taskLockedBlocks.reduce((acc, b) => acc + b.durationMinutes, 0);

        let remainingMin = Math.max(0, estimatedMin - taskLockedMinutes);

        // EXTRA BLOCK FIX: If remainder is small and task has locked blocks, ignore remainder.
        if (remainingMin <= 15 && taskLockedMinutes > 0) {
            console.log(`[Planner] Task ${task.title} (Est: ${estimatedMin}) has ${taskLockedMinutes}m locked. Ignoring small remainder (${remainingMin}m).`);
            remainingMin = 0;
        }

        if (remainingMin === 0) {
            console.log(`[Planner] Task ${task.title} is fully covered by locked blocks.`);
            continue;
        }

        if (remainingMin < 15) {
            console.log(`[Planner] Task ${task.title} essentially covered. Remaining: ${remainingMin}m. Skipping further scheduling.`);
            continue;
        }

        // Determine earliest allowed scheduling day for this task based on explicitly moved blocks
        let earliestAllowedDay = new Date(0); // far past
        if (taskLockedBlocks.length > 0) {
            const minLockedStart = taskLockedBlocks.reduce((min, b) => isBefore(b.startAt, min) ? b.startAt : min, taskLockedBlocks[0].startAt);
            earliestAllowedDay = startOfDay(minLockedStart);
        }

        // Divide the remaining time into 1 to 3 equal blocks (max 3 hours / 3 blocks = ~60 min max per block)
        let targetBlocks = 1;
        if (remainingMin > 120) targetBlocks = 3;
        else if (remainingMin > 60) targetBlocks = 2;

        const workUnit = Math.ceil(remainingMin / targetBlocks);

        // Keep track of days this task is scheduled on to spread chunks across different days
        const scheduledDays = new Set<number>();
        for (const lockedBlock of taskLockedBlocks) {
            scheduledDays.add(getDay(lockedBlock.startAt));
        }

        // Iterate until scheduled or impossible
        while (remainingMin > 0) {
            // Find valid days (before due date) with capacity
            let validDayIndices: number[] = [];
            let fallbackDayIndices: number[] = []; // Days with capacity, but already have a chunk for this task

            for (let i = 0; i < 7; i++) {
                const dayDate = addDays(weekStart, i);
                const dayIdx = getDay(dayDate);

                // Respect deferred schedule primarily
                if (isBefore(dayDate, earliestAllowedDay)) {
                    continue;
                }

                if (isBefore(dayDate, due) && dailyStats.get(i)!.capacity > dailyStats.get(i)!.used) {
                    if (scheduledDays.has(dayIdx)) {
                        fallbackDayIndices.push(i);
                    } else {
                        validDayIndices.push(i);
                    }
                }
            }

            // USE FALLBACK IF NEEDED
            if (validDayIndices.length === 0 && fallbackDayIndices.length > 0) {
                validDayIndices = fallbackDayIndices;
            }

            // SOFT CONSTRAINT FALLBACK: If no future days have capacity, allow scheduling on ANY valid day before due date
            // This prevents chunks from completely disappearing if a user defers a block near a deadline.
            if (validDayIndices.length === 0) {
                for (let i = 0; i < 7; i++) {
                    const dayDate = addDays(weekStart, i);
                    if (isBefore(dayDate, due) && dailyStats.get(i)!.capacity > dailyStats.get(i)!.used) {
                        validDayIndices.push(i);
                    }
                }
            }

            if (validDayIndices.length === 0) {
                console.warn(`[Planner] No availability left for task ${task.title} before ${due}`);
                break;
            }

            // Find the day with lowest UTILIZATION RATIO (Used / Capacity)
            validDayIndices.sort((a, b) => {
                const statsA = dailyStats.get(a)!;
                const statsB = dailyStats.get(b)!;
                const ratioA = statsA.used / (statsA.capacity || 1);
                const ratioB = statsB.used / (statsB.capacity || 1);
                return ratioA - ratioB;
            });

            const bestDayIndex = validDayIndices[0];
            const bestDayStats = dailyStats.get(bestDayIndex)!;

            // Find a slot in that day that has space
            const slot = bestDayStats.slots.find(s => s.availableMinutes > 0);

            if (!slot) {
                bestDayStats.used = bestDayStats.capacity;
                continue;
            }

            const take = Math.min(remainingMin, workUnit, slot.availableMinutes);

            workBlocksToCreate.push({
                taskId: task.id,
                userId: userId,
                startAt: new Date(slot.start),
                durationMinutes: take,
                kind: 'work',
                status: 'planned'
            });

            // Update state: Add BUFFER (15 mins) after block
            const BUFFER_MINUTES = 15;
            slot.start = addMinutes(slot.start, take + BUFFER_MINUTES);
            slot.availableMinutes -= (take + BUFFER_MINUTES);
            bestDayStats.used += (take + BUFFER_MINUTES);
            remainingMin -= take;

            // Mark this day as scheduled for this task to spread future chunks
            scheduledDays.add(bestDayIndex);
        }
    }

    // 4. Save to DB
    if (workBlocksToCreate.length > 0) {
        await prisma.workBlock.createMany({
            data: workBlocksToCreate
        });
    }

    console.log(`[Planner] Created ${workBlocksToCreate.length} blocks.`);
    return workBlocksToCreate;
}
