'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO, setHours, setMinutes, isAfter, addMinutes } from 'date-fns';
import TaskDetailsModal from './TaskDetailsModal';
import WorkBlockModal from './WorkBlockModal';

type WorkBlock = {
    id: string;
    startAt: string; // ISO
    durationMinutes: number;
    task: { id: string; title: string; dueAt?: string; course?: { code?: string; color: string | null; }; status?: string };
};

const PALETTE = ['#fcdab8', '#c58b6e', '#bbd8eb', '#d5b281', '#cfb4a8'];

// Helper to convert HEX to HSL, tweak lightness based on ID hashing, and convert back.
// Helper to convert HEX to HSL, tweak lightness based on ID hashing, and convert back.
const getTaskColor = (taskId: string, individualId?: string): string => {
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
        hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PALETTE.length;
    const baseHex = PALETTE[idx];

    if (!individualId) return baseHex;

    // Adjust lightness based on the individual block ID to make it distinct but the same tone
    let blockHash = 0;
    for (let i = 0; i < individualId.length; i++) {
        blockHash = individualId.charCodeAt(i) + ((blockHash << 5) - blockHash);
    }

    // Hex to RGB
    const r = parseInt(baseHex.slice(1, 3), 16);
    const g = parseInt(baseHex.slice(3, 5), 16);
    const b = parseInt(baseHex.slice(5, 7), 16);

    // RGB to HSL
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
            case gNorm: h = (bNorm - rNorm) / d + 2; break;
            case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
    }

    // Modulate lightness +/- 15% based on blockHash
    const mod = (Math.abs(blockHash) % 30) - 15;
    let newL = Math.max(0.1, Math.min(0.9, l + (mod / 100)));

    // HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let nr, ng, nb;
    if (s === 0) {
        nr = ng = nb = newL;
    } else {
        const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
        const p = 2 * newL - q;
        nr = hue2rgb(p, q, h + 1 / 3);
        ng = hue2rgb(p, q, h);
        nb = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
};

type Task = {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    status: string;
    estimatedMinutes: number | null;
    needsWorkBlocks: boolean;
    course?: { code: string; color: string | null };
};

type ClassPeriod = {
    id: string;
    dayOfWeek: number;
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    location: string | null;
    course: { id: string; name: string; code: string; color: string | null };
};

export default function Calendar({ tasks: initialTasks, workBlocks: initialBlocks, classPeriods = [] }: { tasks: Task[], workBlocks: WorkBlock[], classPeriods?: ClassPeriod[] }) {
    const router = useRouter();
    const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [tasks, setTasks] = useState(initialTasks);
    const [workBlocks, setWorkBlocks] = useState(initialBlocks);

    // Sync from props when they update (e.g. after a router.refresh())
    useEffect(() => {
        setTasks(initialTasks);
        setWorkBlocks(initialBlocks);
    }, [initialTasks, initialBlocks]);

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedBlock, setSelectedBlock] = useState<WorkBlock | null>(null);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [zoomLevel, setZoomLevel] = useState(100); // Default pixels per hour

    const [draggedBlock, setDraggedBlock] = useState<WorkBlock | null>(null);
    const [dragPreviewY, setDragPreviewY] = useState<number | null>(null);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isAddingBlock, setIsAddingBlock] = useState(false);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [addingLineHeight, setAddingLineHeight] = useState(false); // Just to avoid typescript complaining if it's unused later
    const [newlyAddedBlockId, setNewlyAddedBlockId] = useState<string | null>(null);

    // Update current time every minute for accurate highlighting
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // 1 minute
        return () => clearInterval(timer);
    }, []);

    const toggleSelection = (id: string, type: 'block' | 'course') => {
        if (type === 'block') {
            const newSet = new Set(selectedBlockIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedBlockIds(newSet);
        } else {
            const newSet = new Set(selectedCourseIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedCourseIds(newSet);
        }
    };

    const handleBulkDelete = async () => {
        const totalSelected = selectedBlockIds.size + selectedCourseIds.size;
        if (totalSelected === 0) return;

        let message = `Delete ${totalSelected} selected items?`;
        if (selectedCourseIds.size > 0) {
            message += `\n\nNote: Removing ${selectedCourseIds.size} courses from the calendar will NOT delete the course or its tasks from your database.`;
        }

        if (!confirm(message)) return;

        try {
            const promises = [];

            if (selectedBlockIds.size > 0) {
                promises.push(fetch('/api/plan/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedBlockIds) })
                }));
            }

            if (selectedCourseIds.size > 0) {
                promises.push(fetch('/api/courses/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: Array.from(selectedCourseIds) })
                }));
            }

            const results = await Promise.all(promises);
            const allOk = results.every(res => res.ok);

            if (allOk) {
                // Optimistic update
                setWorkBlocks(workBlocks.filter(b => !selectedBlockIds.has(b.id) && (
                    // Also filter out blocks if their task's course is being deleted? 
                    // We don't have task.courseId handy on the block easily without deep check, 
                    // but router.refresh() will fix it.
                    true
                )));
                // We'd also technically remove classPeriods optimistically but that's prop-driven.

                setSelectedBlockIds(new Set());
                setSelectedCourseIds(new Set());
                setSelectionMode(false);
                router.refresh();
            } else {
                alert('Failed to delete some items');
            }
        } catch (e) {
            alert('Error deleting items');
        }
    };

    const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
    const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));

    // Task Handlers
    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(tasks.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
    };

    const handleTaskDelete = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
        setWorkBlocks(workBlocks.filter(b => b.task.id !== taskId));
    };

    // Block Handlers
    const handleBlockUpdate = (updatedBlock: WorkBlock) => {
        setWorkBlocks(workBlocks.map(b => b.id === updatedBlock.id ? { ...b, ...updatedBlock } : b));
    };

    const handleBlockDelete = (blockId: string) => {
        setWorkBlocks(workBlocks.filter(b => b.id !== blockId));
    };

    // Initialize Mobile Drag and Drop Polyfill
    useEffect(() => {
        let isMounted = true;
        const initDragDrop = async () => {
            try {
                const { polyfill } = await import('mobile-drag-drop');
                const { scrollBehaviourDragImageTranslateOverride } = await import('mobile-drag-drop/scroll-behaviour');
                // @ts-ignore
                await import('mobile-drag-drop/default.css');

                if (isMounted) {
                    polyfill({
                        dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
                    });
                }
            } catch (e) {
                console.error("Failed to load mobile drag and drop", e);
            }
        };

        if (typeof window !== 'undefined') {
            initDragDrop();
            const touchListener = () => { };
            // Required for iOS Safari to allow drag and drop preventDefault without scrolling
            window.addEventListener('touchmove', touchListener, { passive: false });
            return () => {
                isMounted = false;
                window.removeEventListener('touchmove', touchListener);
            };
        }
    }, []);

    const [isDragging, setIsDragging] = useState(false);
    const [dragOverDay, setDragOverDay] = useState<string | null>(null);
    const dragTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resizeRef = useRef<{ id: string, startY: number, startDuration: number, endDuration: number } | null>(null);
    const wasResizingRef = useRef<boolean>(false);
    const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
    const [resizingDuration, setResizingDuration] = useState<number | null>(null);

    const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, block: WorkBlock) => {
        e.stopPropagation();
        e.preventDefault();
        wasResizingRef.current = true;
        const clientY = e.clientY;
        resizeRef.current = { id: block.id, startY: clientY, startDuration: block.durationMinutes, endDuration: block.durationMinutes };
        setResizingBlockId(block.id);
        setResizingDuration(block.durationMinutes);

        const handleMove = (ev: PointerEvent) => {
            if (!resizeRef.current) return;
            const deltaY = ev.clientY - resizeRef.current.startY;
            // Snappy feeling: 1 pixel = 1 min
            const deltaMins = Math.round(deltaY / 1);
            const newD = Math.max(15, Math.ceil((resizeRef.current.startDuration + deltaMins) / 15) * 15);
            resizeRef.current.endDuration = newD;
            setResizingDuration(newD);
        };

        const handleEnd = async () => {
            document.removeEventListener('pointermove', handleMove);
            document.removeEventListener('pointerup', handleEnd);
            document.removeEventListener('pointercancel', handleEnd);

            if (!resizeRef.current) return;
            const blockId = resizeRef.current.id;
            const finalDuration = resizeRef.current.endDuration;
            const startDuration = resizeRef.current.startDuration;

            setResizingBlockId(null);
            setResizingDuration(null);
            resizeRef.current = null;
            setTimeout(() => { wasResizingRef.current = false; }, 100);

            if (finalDuration && finalDuration !== startDuration) {
                setWorkBlocks(prev => prev.map(b => b.id === blockId ? { ...b, durationMinutes: finalDuration } : b));
                try {
                    const res = await fetch(`/api/blocks/${blockId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ durationMinutes: finalDuration })
                    });
                    if (res.ok) router.refresh();
                } catch (err) {
                    console.error("Failed resize", err);
                }
            }
        };

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleEnd);
        document.addEventListener('pointercancel', handleEnd);
    };

    const finalizeDrop = async (blockId: string, newStart: Date, isDuplicate: boolean) => {
        const blockToUpdate = workBlocks.find(b => b.id === blockId);
        if (!blockToUpdate) return;

        if (blockToUpdate.task.dueAt && isAfter(newStart, parseISO(blockToUpdate.task.dueAt))) {
            const confirmed = window.confirm(`Warning: You are moving this workblock past the task's due date (${format(parseISO(blockToUpdate.task.dueAt), 'MMM d, h:mm a')}).\n\nAre you sure you want to disregard the deadline and keep it here?`);
            if (!confirmed) return;
        }

        if (isDuplicate) {
            try {
                const res = await fetch(`/api/blocks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        taskId: blockToUpdate.task.id,
                        startAt: newStart.toISOString(),
                        durationMinutes: blockToUpdate.durationMinutes
                    })
                });
                if (res.ok) router.refresh();
            } catch (error) {
                console.error("Failed to duplicate block", error);
            }
        } else {
            const updatedBlock = { ...blockToUpdate, startAt: newStart.toISOString() };
            handleBlockUpdate(updatedBlock);

            try {
                const res = await fetch(`/api/blocks/${blockId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startAt: newStart.toISOString() })
                });
                if (res.ok) router.refresh();
            } catch (error) {
                console.error("Failed to update block position", error);
            }
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, block: WorkBlock) => {
        // e.dataTransfer must be populated synchronously
        e.dataTransfer.setData('blockId', block.id);
        e.dataTransfer.setData('originalStart', block.startAt);
        e.dataTransfer.effectAllowed = 'copyMove';
        // Delay DOM mutations (overlay) to the next tick so the browser can capture the ghost image
        setTimeout(() => {
            setIsDragging(true);
            setDraggedBlock(block);
        }, 0);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDragOverDay(null);
        setDraggedBlock(null);
        setDragPreviewY(null);
        if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    };

    const handleDragOver = (e: React.DragEvent, dayStr?: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';
        if (dayStr && dragOverDay !== dayStr) {
            setDragOverDay(dayStr);
        }
    };

    const handleEdgeDragOver = (e: React.DragEvent, weeksOffset: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';

        if (!dragTimerRef.current) {
            dragTimerRef.current = setTimeout(() => {
                setCurrentWeekStart(prev => startOfWeek(addDays(prev, 7 * weeksOffset), { weekStartsOn: 1 }));
                dragTimerRef.current = null; // Reset to allow continuous scrolling if they keep holding it
            }, 700); // 700ms hover delay
        }
    };

    const handleEdgeDragLeave = () => {
        if (dragTimerRef.current) {
            clearTimeout(dragTimerRef.current);
            dragTimerRef.current = null;
        }
    };

    const handleWeekDrop = async (e: React.DragEvent, weeksOffset: number) => {
        e.preventDefault();
        setIsDragging(false);
        const blockId = e.dataTransfer.getData('blockId');
        const originalStartStr = e.dataTransfer.getData('originalStart');

        if (!blockId || !originalStartStr) return;

        const originalStart = new Date(originalStartStr);
        const newStart = addDays(originalStart, 7 * weeksOffset);

        setCurrentWeekStart(startOfWeek(addDays(currentWeekStart, 7 * weeksOffset), { weekStartsOn: 1 }));

        await finalizeDrop(blockId, newStart, e.altKey || e.ctrlKey);
    };

    const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
        e.preventDefault();
        setIsDragging(false);
        setDragOverDay(null);
        e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';
        const blockId = e.dataTransfer.getData('blockId');
        const originalStartStr = e.dataTransfer.getData('originalStart');

        if (!blockId || !originalStartStr) return;

        const originalStart = new Date(originalStartStr);
        const newStart = new Date(targetDay);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

        await finalizeDrop(blockId, newStart, e.altKey || e.ctrlKey);
    };

    const handleTimeDrop = async (e: React.DragEvent, targetDay: Date, hour: number) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setDragOverDay(null);
        const blockId = e.dataTransfer.getData('blockId');
        const originalStartStr = e.dataTransfer.getData('originalStart');

        if (!blockId || !originalStartStr) return;

        const originalStart = new Date(originalStartStr);
        const newStart = new Date(targetDay);
        // Snap to exact hour
        newStart.setHours(hour, 0, 0, 0);

        await finalizeDrop(blockId, newStart, e.altKey || e.ctrlKey);
    };

    const days = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

    // Helper to get periods for a specific date
    const getPeriodsForDay = (date: Date) => {
        const dayOfWeek = date.getDay(); // 0-6
        return classPeriods.filter(cp => {
            if (cp.dayOfWeek !== dayOfWeek) return false;

            // Check start/end dates
            // course might not be fully typed if client isn't generated, but we cast or assume
            const course = cp.course as any;
            if (course.startDate) {
                const start = new Date(course.startDate);
                if (date < start) return false;
            }
            if (course.endDate) {
                const end = new Date(course.endDate);
                if (date > end) return false;
            }
            return true;
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const [showCourses, setShowCourses] = useState(true);
    const [showTasks, setShowTasks] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const storedCourses = localStorage.getItem('planner_showCourses');
        const storedTasks = localStorage.getItem('planner_showTasks');
        if (storedCourses !== null) setShowCourses(JSON.parse(storedCourses));
        if (storedTasks !== null) setShowTasks(JSON.parse(storedTasks));
        setIsLoaded(true);
    }, []);

    // Save preferences when they change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('planner_showCourses', JSON.stringify(showCourses));
        }
    }, [showCourses, isLoaded]);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('planner_showTasks', JSON.stringify(showTasks));
        }
    }, [showTasks, isLoaded]);

    // Calculate dynamic time scale bounds
    const PIXELS_PER_HOUR = zoomLevel; // Configurable zoom height
    const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

    let minHour = 8;
    let maxHour = 20;

    days.forEach(day => {
        if (showCourses) {
            const periods = getPeriodsForDay(day);
            periods.forEach(p => {
                const startH = parseInt(p.startTime.split(':')[0]);
                const endH = parseInt(p.endTime.split(':')[0]) + (parseInt(p.endTime.split(':')[1]) > 0 ? 1 : 0);
                if (startH < minHour) minHour = startH;
                if (endH > maxHour) maxHour = endH;
            });
        }
        if (showTasks) {
            workBlocks
                .filter(wb => isSameDay(parseISO(wb.startAt), day))
                .forEach(wb => {
                    const start = parseISO(wb.startAt);
                    if (start.getHours() < minHour) minHour = start.getHours();
                    const end = addMinutes(start, wb.durationMinutes);
                    const endH = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
                    if (endH > maxHour) maxHour = endH;
                });
            tasks
                .filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day))
                .forEach(t => {
                    const hour = parseISO(t.dueAt!).getHours();
                    if (hour < minHour) minHour = hour;
                    if (!t.needsWorkBlocks && t.estimatedMinutes) {
                        const end = addMinutes(parseISO(t.dueAt!), t.estimatedMinutes);
                        const endH = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
                        if (endH > maxHour) maxHour = endH;
                    } else {
                        if (hour + 1 > maxHour) maxHour = Math.min(24, hour + 1);
                    }
                });
        }
    });

    // Calculate maximum overlapping columns per day for proportional sizing
    const maxColsPerDay: number[] = new Array(7).fill(1);

    days.forEach((day, dayIndex) => {
        let items: { startMins: number, endMins: number }[] = [];

        if (showCourses) {
            getPeriodsForDay(day).forEach(p => {
                const [h, m] = p.startTime.split(':');
                const [eh, em] = p.endTime.split(':');
                const startMins = parseInt(h) * 60 + parseInt(m);
                const durationMins = (parseInt(eh) * 60 + parseInt(em)) - startMins;
                items.push({ startMins, endMins: startMins + durationMins });
            });
        }
        if (showTasks) {
            workBlocks.filter(wb => isSameDay(parseISO(wb.startAt), day)).forEach(wb => {
                const startMins = parseISO(wb.startAt).getHours() * 60 + parseISO(wb.startAt).getMinutes();
                items.push({ startMins, endMins: startMins + wb.durationMinutes });
            });
            tasks.filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day)).forEach(t => {
                const startMins = parseISO(t.dueAt!).getHours() * 60 + parseISO(t.dueAt!).getMinutes() - 14;
                items.push({ startMins, endMins: startMins + 28 });
            });
        }

        items.sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins);

        const clusters: { startMins: number, endMins: number }[][] = [];
        let currentCluster: { startMins: number, endMins: number }[] = [];
        let clusterEnd = 0;

        for (const item of items) {
            if (currentCluster.length === 0) {
                currentCluster.push(item);
                clusterEnd = item.endMins;
            } else if (item.startMins < clusterEnd) {
                currentCluster.push(item);
                clusterEnd = Math.max(clusterEnd, item.endMins);
            } else {
                clusters.push(currentCluster);
                currentCluster = [item];
                clusterEnd = item.endMins;
            }
        }
        if (currentCluster.length > 0) clusters.push(currentCluster);

        let maxCols = 1;
        for (const cluster of clusters) {
            const columns: { startMins: number, endMins: number }[][] = [];
            for (const item of cluster) {
                let placed = false;
                for (const col of columns) {
                    if (col[col.length - 1].endMins <= item.startMins) {
                        col.push(item);
                        placed = true;
                        break;
                    }
                }
                if (!placed) columns.push([item]);
            }
            maxCols = Math.max(maxCols, columns.length);
        }
        maxColsPerDay[dayIndex] = maxCols;
    });

    const gridTemplateColumns = maxColsPerDay.map(cols => `${Math.max(1, cols)}fr`).join(' ');

    const totalHours = maxHour - minHour;
    const gridHeight = totalHours * PIXELS_PER_HOUR;

    return (
        <div className="flex flex-col h-full bg-surface-soft font-nunito text-text-soft overflow-hidden w-full relative">
            {selectedTask && (
                <TaskDetailsModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleTaskDelete}
                />
            )}
            {selectedBlock && (
                <WorkBlockModal
                    block={selectedBlock}
                    onClose={() => setSelectedBlock(null)}
                    onUpdate={handleBlockUpdate}
                    onDelete={handleBlockDelete}
                />
            )}

            {/* TOOLBAR */}
            <div className="flex items-center gap-2.5 px-4 sm:px-7 py-3.5 sm:py-4.5 border-b border-line-soft shrink-0 flex-wrap bg-surface-soft z-10 transition-colors">
                <div className="flex items-center gap-2 mr-4 lg:mr-8">
                    <button onClick={prevWeek} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-bg-soft text-muted-soft flex items-center justify-center hover:bg-card-soft transition-colors text-lg sm:text-xl shrink-0 -mt-1 cursor-pointer">‹</button>
                    <h2 className="font-lora text-xl sm:text-2xl font-medium text-text-soft tracking-tight whitespace-nowrap">
                        {format(currentWeekStart, 'MMMM yyyy')}
                    </h2>
                    <button onClick={nextWeek} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-bg-soft text-muted-soft flex items-center justify-center hover:bg-card-soft transition-colors text-lg sm:text-xl shrink-0 -mt-1 cursor-pointer">›</button>
                    <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 sm:px-4 py-1.5 ml-2 rounded-full border border-line-soft font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-surface-soft text-muted-soft hover:bg-card-soft hidden sm:block cursor-pointer">Today</button>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:gap-3 flex-1">
                    <button onClick={() => setShowCourses(!showCourses)} className={`px-3 sm:px-4 py-1.5 rounded-full border border-line-soft font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${showCourses ? 'bg-surface-soft text-text-soft' : 'bg-transparent text-muted-soft line-through opacity-60'}`}>Courses</button>
                    <button onClick={() => setShowTasks(!showTasks)} className={`px-3 sm:px-4 py-1.5 rounded-full border border-line-soft font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${showTasks ? 'bg-surface-soft text-text-soft' : 'bg-transparent text-muted-soft line-through opacity-60'}`}>Tasks</button>

                    <div className="hidden md:flex items-center bg-transparent border border-line-soft rounded-full overflow-hidden ml-auto">
                        <button onClick={() => setZoomLevel(Math.max(40, zoomLevel - 20))} className="px-3.5 py-1.5 bg-transparent border-none text-xs font-semibold text-muted-soft hover:text-text-soft hover:bg-card-soft transition-colors cursor-pointer">− Zoom</button>
                        <span className="text-[10px] text-line-soft opacity-60">|</span>
                        <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 20))} className="px-3.5 py-1.5 bg-transparent border-none text-xs font-semibold text-muted-soft hover:text-text-soft hover:bg-card-soft transition-colors cursor-pointer">Zoom +</button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:ml-auto md:ml-2">
                        <button 
                            disabled={selectionMode} 
                            onClick={async (e) => {
                                const btn = e.currentTarget;
                                const originalText = btn.innerHTML;
                                btn.innerHTML = '↻ Updating...';
                                btn.disabled = true;
                                try {
                                    const res = await fetch('/api/plan/generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ mode: 'update' })
                                    });
                                    if (!res.ok) throw new Error('Failed to update schedule');
                                    router.refresh();
                                } catch (error) {
                                    alert('Error updating schedule');
                                } finally {
                                    btn.innerHTML = originalText;
                                    btn.disabled = false;
                                }
                            }} 
                            className={`px-3 sm:px-4 py-1.5 rounded-full border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors ${selectionMode ? 'bg-bg-soft text-muted-soft opacity-50 cursor-not-allowed' : 'bg-[#a37966] text-white shadow-[0_3px_12px_rgba(163,121,102,0.3)] hover:bg-[#8f6a5a] cursor-pointer'}`}
                        >
                            ↻ Update Schedule
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                                className={`px-3 sm:px-4 py-1.5 rounded-full font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${isActionsMenuOpen ? 'bg-card-soft text-text-soft border border-line-soft' : 'bg-transparent text-text-soft border border-line-soft hover:bg-card-soft'}`}
                            >
                                ⋮ Actions
                            </button>

                            {isActionsMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-soft border border-line-soft rounded-xl shadow-lg z-[60] py-1 flex flex-col gap-1">
                                    <button
                                        onClick={() => {
                                            setSelectionMode(!selectionMode);
                                            setSelectedBlockIds(new Set());
                                            setSelectedCourseIds(new Set());
                                            setIsActionsMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 font-nunito text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectionMode ? 'bg-[#a37966] text-white' : 'bg-transparent text-text-soft hover:bg-bg-soft'}`}
                                    >
                                        ⊞ {selectionMode ? 'Cancel Selection' : 'Select Items'}
                                    </button>
                                    
                                    {selectionMode && (selectedBlockIds.size > 0 || selectedCourseIds.size > 0) && (
                                        <button
                                            onClick={() => { handleBulkDelete(); setIsActionsMenuOpen(false); }}
                                            className="w-full text-left px-4 py-2 border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                                        >
                                            Delete ({selectedBlockIds.size + selectedCourseIds.size})
                                        </button>
                                    )}

                                    {!selectionMode && (
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsAddingBlock(!isAddingBlock);
                                                }} 
                                                className="w-full text-left px-4 py-2 border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-transparent text-text-soft hover:bg-bg-soft cursor-pointer"
                                            >
                                                ＋ Add Block
                                            </button>
                                            
                                            {isAddingBlock && (
                                                <div className="absolute right-full top-0 mr-2 w-64 bg-card-soft border border-line-soft rounded-xl shadow-md z-[60] max-h-64 overflow-y-auto p-1">
                                                    <div className="text-[10px] font-bold text-muted-soft uppercase tracking-wider mb-1 pl-2 pt-1 flex justify-between items-center pr-2">
                                                        <span>Select a Task</span>
                                                        <button onClick={(e) => { e.stopPropagation(); setIsAddingBlock(false); }} className="text-muted-soft hover:text-text-soft text-sm leading-none">&times;</button>
                                                    </div>
                                                    {tasks.filter(t => t.status !== 'done').length === 0 ? (
                                                        <div className="p-3 text-xs text-muted-soft text-center">No active tasks</div>
                                                    ) : (
                                                        tasks.filter(t => t.status !== 'done').map(task => (
                                                            <button
                                                                key={task.id}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    setIsAddingBlock(false);
                                                                    setIsActionsMenuOpen(false);
                                                                    try {
                                                                        const defaultDate = new Date();
                                                                        defaultDate.setDate(defaultDate.getDate() + 1);
                                                                        defaultDate.setHours(9, 0, 0, 0);
                                                                        const newTaskRes = await fetch('/api/blocks', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ taskId: task.id, startAt: defaultDate.toISOString(), durationMinutes: 60 })
                                                                        });
                                                                        if (!newTaskRes.ok) throw new Error('Failed');
                                                                        const createdBlock = await newTaskRes.json();
                                                                        setCurrentWeekStart(startOfWeek(defaultDate, { weekStartsOn: 1 }));
                                                                        setNewlyAddedBlockId(createdBlock.id);
                                                                        setTimeout(() => setNewlyAddedBlockId(null), 3000);
                                                                        router.refresh();
                                                                    } catch (error) { alert('Failed to add work block'); }
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-xs hover:bg-bg-soft text-text-soft rounded-lg transition-colors truncate mb-0.5 cursor-pointer"
                                                            >
                                                                {task.title}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!selectionMode && (
                                        <button onClick={async () => {
                                            setIsActionsMenuOpen(false);
                                            if (confirm('Clear ALL items from the calendar?\n\nThis will remove the schedule but keep Courses & Tasks.')) {
                                                await fetch('/api/plan', { method: 'DELETE' });
                                                window.location.reload();
                                            }
                                        }} className="w-full text-left px-4 py-2 border-none font-nunito text-xs font-semibold whitespace-nowrap transition-colors bg-transparent text-[#a37966] hover:bg-[#f5e8e4] cursor-pointer">
                                            ✕ Clear All
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drop Zones */}
            {isDragging && (
                <>
                    <div className="absolute top-0 left-0 w-12 h-full bg-sky-bg/80 z-20 flex items-center justify-center border-r-2 border-sky transition-all" onDragOver={(e) => handleEdgeDragOver(e, -1)} onDragLeave={handleEdgeDragLeave} onDrop={(e) => handleWeekDrop(e, -1)}></div>
                    <div className="absolute top-0 right-0 w-12 h-full bg-sky-bg/80 z-20 flex items-center justify-center border-l-2 border-sky transition-all" onDragOver={(e) => handleEdgeDragOver(e, 1)} onDragLeave={handleEdgeDragLeave} onDrop={(e) => handleWeekDrop(e, 1)}></div>
                </>
            )}

            {/* CALENDAR AREA */}
            <div className="flex-1 overflow-auto px-4 sm:px-7 pb-5 format-scroll relative">
                
                {/* WEEK HEADER */}
                <div className="grid sticky top-0 bg-surface-soft z-[5] pt-3.5 pb-2 border-b border-line-soft gap-1" style={{ gridTemplateColumns: `54px ${gridTemplateColumns}` }}>
                    <div className=""></div>
                    {days.map((day, i) => {
                        const isCurrent = isSameDay(day, new Date());
                        return (
                            <div key={day.toISOString()} className="text-center py-1.5 px-1">
                                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-soft">{format(day, 'EEE')}</div>
                                <div className={`mt-0.5 w-9 h-9 mx-auto flex items-center justify-center rounded-full text-xl font-medium transition-colors ${isCurrent ? 'bg-[#a37966] text-white shadow-md' : 'text-text-soft'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* TIME GRID */}
                <div className="grid gap-1 relative mt-4" style={{ gridTemplateColumns: `54px ${gridTemplateColumns}`, height: `${gridHeight}px` }}>
                    
                    {/* Time labels column */}
                    <div className="flex flex-col relative z-[2] border-r border-transparent" style={{ height: `${gridHeight}px` }}>
                        {Array.from({ length: totalHours + 1 }).map((_, i) => {
                            const h = minHour + i;
                            return (
                                <div key={`time-${h}`} className="absolute w-full pr-2.5 text-[0.65rem] text-muted-soft text-right font-semibold leading-none flex justify-end -translate-y-[6px]" style={{ top: `${i * PIXELS_PER_HOUR}px` }}>
                                    {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : h === 24 ? '12 AM' : `${h > 24 ? h - 24 : h - 12} PM`}
                                </div>
                            );
                        })}
                    </div>

                    {/* Horizontal lines */}
                    <div className="absolute inset-0 left-[54px] pointer-events-none flex flex-col z-[1]">
                        {Array.from({ length: totalHours }).map((_, i) => (
                            <div key={`line-${i}`} className="w-full flex-shrink-0 border-t border-line-soft transition-colors" style={{ height: `${PIXELS_PER_HOUR}px` }}></div>
                        ))}
                    </div>

                    {/* Now Line */}
                    {(() => {
                        const currentTotalMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const minTotalMinutes = minHour * 60;
                        const maxTotalMinutes = maxHour * 60;
                        if (currentTotalMinutes >= minTotalMinutes && currentTotalMinutes <= maxTotalMinutes) {
                            return (
                                <div className="absolute left-[54px] right-0 h-[1px] bg-[#d4a090] z-[4] pointer-events-none" style={{ top: `${(currentTotalMinutes - minTotalMinutes) * PIXELS_PER_MINUTE}px` }}>
                                    <div className="absolute -left-1.5 -top-[4px] w-2.5 h-2.5 rounded-full bg-[#d4a090]"></div>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Columns */}
                    {days.map(day => (
                        <div
                            key={day.toISOString()}
                            className="relative border-r border-transparent flex flex-col group z-[2]"
                            style={{ height: `${gridHeight}px` }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = e.altKey || e.ctrlKey ? 'copy' : 'move';
                                const dayIso = day.toISOString();
                                if (dragOverDay !== dayIso) setDragOverDay(dayIso);
                                const bounds = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - bounds.top;
                                const snappedMinutes = Math.round(y / (15 * PIXELS_PER_MINUTE)) * 15;
                                const previewY = snappedMinutes * PIXELS_PER_MINUTE;
                                if (dragPreviewY !== previewY) setDragPreviewY(previewY);
                            }}
                            onDrop={async (e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                setDragOverDay(null);
                                setDraggedBlock(null);
                                setDragPreviewY(null);
                                const bounds = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - bounds.top;
                                const snappedMinutes = Math.round(y / (15 * PIXELS_PER_MINUTE)) * 15;
                                const totalMinutes = minHour * 60 + snappedMinutes;
                                const hour = Math.floor(totalMinutes / 60);
                                const minute = Math.max(0, Math.min(59, totalMinutes % 60));
                                const blockId = e.dataTransfer.getData('blockId');
                                const originalStartStr = e.dataTransfer.getData('originalStart');
                                if (!blockId || !originalStartStr) return;
                                const newStart = new Date(day);
                                newStart.setHours(hour, minute, 0, 0);
                                await finalizeDrop(blockId, newStart, e.altKey || e.ctrlKey);
                            }}
                        >
                            {isDragging && dragOverDay === day.toISOString() && (
                                <div className="absolute inset-0 bg-sky-bg/40 opacity-50 z-[1] rounded-lg"></div>
                            )}

                            {isDragging && dragOverDay === day.toISOString() && draggedBlock && dragPreviewY !== null && (
                                <div className="absolute left-1 right-1 rounded-[12px] p-1.5 px-2 bg-sky-bg border-l-[3px] border-sky border-dashed z-[50] pointer-events-none flex flex-col overflow-hidden shadow-sm"
                                     style={{
                                         top: `${dragPreviewY}px`,
                                         height: `${Math.max(28, draggedBlock.durationMinutes * PIXELS_PER_MINUTE)}px`
                                     }}>
                                     <div className="text-[10px] text-[#2a5070] font-bold opacity-70 mb-0.5 tracking-tight">
                                        {format(setMinutes(setHours(new Date(), Math.floor((dragPreviewY / PIXELS_PER_MINUTE) + minHour)), Math.round(dragPreviewY / PIXELS_PER_MINUTE) % 60), 'h:mm a')}
                                     </div>
                                     <div className="text-xs text-[#2a5070] font-semibold line-clamp-1">{draggedBlock.task.title}</div>
                                </div>
                            )}

                            {(() => {
                                type CalendarItem =
                                    | { type: 'period'; data: ClassPeriod; time: Date; startMins: number; endMins: number }
                                    | { type: 'block'; data: WorkBlock; time: Date; startMins: number; endMins: number }
                                    | { type: 'task'; data: Task; time: Date; startMins: number; endMins: number };
                                
                                const items: CalendarItem[] = [];

                                if (showCourses) {
                                    const periods = getPeriodsForDay(day);
                                    items.push(...periods.map(p => {
                                        const [h, m] = p.startTime.split(':');
                                        const [eh, em] = p.endTime.split(':');
                                        const startMins = parseInt(h) * 60 + parseInt(m);
                                        const durationMins = (parseInt(eh) * 60 + parseInt(em)) - startMins;
                                        const height = Math.max(28, durationMins * PIXELS_PER_MINUTE);
                                        const d = new Date(day);
                                        d.setHours(parseInt(h), parseInt(m), 0, 0);
                                        return { type: 'period' as const, data: p, time: d, startMins, endMins: startMins + (height / PIXELS_PER_MINUTE) };
                                    }));
                                }

                                if (showTasks) {
                                    workBlocks.filter(wb => isSameDay(parseISO(wb.startAt), day)).forEach(wb => {
                                        const start = parseISO(wb.startAt);
                                        const startMins = start.getHours() * 60 + start.getMinutes();
                                        const height = Math.max(28, wb.durationMinutes * PIXELS_PER_MINUTE);
                                        items.push({ type: 'block' as const, data: wb, time: start, startMins, endMins: startMins + (height / PIXELS_PER_MINUTE) });
                                    });

                                    tasks.filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day)).forEach(t => {
                                        const time = parseISO(t.dueAt!);
                                        if (!t.needsWorkBlocks && t.estimatedMinutes) {
                                            const startMins = time.getHours() * 60 + time.getMinutes();
                                            const height = Math.max(28, t.estimatedMinutes * PIXELS_PER_MINUTE);
                                            items.push({ type: 'task' as const, data: t, time, startMins, endMins: startMins + (height / PIXELS_PER_MINUTE) });
                                        } else {
                                            const startMins = time.getHours() * 60 + time.getMinutes() - (14 / PIXELS_PER_MINUTE);
                                            items.push({ type: 'task' as const, data: t, time, startMins, endMins: startMins + (28 / PIXELS_PER_MINUTE) });
                                        }
                                    });
                                }

                                items.sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins);
                                const clusters: CalendarItem[][] = [];
                                let currentCluster: CalendarItem[] = [];
                                let clusterEnd = 0;

                                for (const item of items) {
                                    if (currentCluster.length === 0) { currentCluster.push(item); clusterEnd = item.endMins; }
                                    else if (item.startMins < clusterEnd) { currentCluster.push(item); clusterEnd = Math.max(clusterEnd, item.endMins); }
                                    else { clusters.push(currentCluster); currentCluster = [item]; clusterEnd = item.endMins; }
                                }
                                if (currentCluster.length > 0) clusters.push(currentCluster);

                                const itemStyles = new Map<CalendarItem, { left: string, width: string, zIndexOffset: number }>();

                                for (const cluster of clusters) {
                                    const columns: CalendarItem[][] = [];
                                    for (const item of cluster) {
                                        let placed = false;
                                        for (const col of columns) {
                                            // Ensure a small gap between end and start of consecutive items in same column
                                            if (col[col.length - 1].endMins <= item.startMins) {
                                                col.push(item); placed = true; break;
                                            }
                                        }
                                        if (!placed) columns.push([item]);
                                    }
                                    const numCols = columns.length;
                                    columns.forEach((col, colIndex) => {
                                        col.forEach(item => {
                                            itemStyles.set(item, {
                                                left: `calc(${(colIndex / numCols) * 100}% + 1px)`,
                                                width: `calc(${100 / numCols}% - 2px)`,
                                                zIndexOffset: colIndex
                                            });
                                        });
                                    });
                                }

                                const colorClasses = [
                                    { bg: 'var(--color-lav-bg)', color: '#5a4878', border: 'var(--color-lavender)' },
                                    { bg: 'var(--color-sand-bg)', color: '#6a5030', border: 'var(--color-sand)' },
                                    { bg: 'var(--color-sage-bg)', color: '#3a5a38', border: 'var(--color-sage)' },
                                    { bg: 'var(--color-sky-bg)', color: '#2a5070', border: 'var(--color-sky)' },
                                    { bg: 'var(--color-rose-bg)', color: '#7a3850', border: 'var(--color-rose)' },
                                    { bg: 'var(--color-peach-bg)', color: '#7a3820', border: 'var(--color-peach)' }
                                ];

                                const getHashColor = (str: string) => {
                                    let h = 0; for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
                                    return colorClasses[Math.abs(h) % colorClasses.length];
                                };

                                return items.map((item, index) => {
                                    const itemTotalMinutes = item.time.getHours() * 60 + item.time.getMinutes();
                                    const itemY = (itemTotalMinutes - (minHour * 60)) * PIXELS_PER_MINUTE;
                                    if (itemTotalMinutes < minHour * 60 || itemTotalMinutes >= maxHour * 60) {
                                        if (!(item.type === 'task' && itemTotalMinutes === maxHour * 60)) {}
                                    }

                                    if (item.type === 'period') {
                                        const period = item.data;
                                        const isSelected = selectedCourseIds.has(period.course.id);
                                        const formatTime = (t: string) => {
                                            const [h, m] = t.split(':');
                                            const d = new Date(); d.setHours(parseInt(h), parseInt(m));
                                            return format(d, 'h:mm a');
                                        };
                                        const [eh, em] = period.endTime.split(':');
                                        const [sh, sm] = period.startTime.split(':');
                                        const durationMins = (parseInt(eh)*60 + parseInt(em)) - (parseInt(sh)*60 + parseInt(sm));
                                        let pxHeight = Math.max(28, durationMins * PIXELS_PER_MINUTE);

                                        const isPast = (() => {
                                            const endDate = new Date(day); endDate.setHours(parseInt(eh), parseInt(em), 0, 0);
                                            return currentTime > endDate;
                                        })();
                                        
                                        const isCurrent = (() => {
                                            const startDate = new Date(day); startDate.setHours(parseInt(sh), parseInt(sm), 0, 0);
                                            const endDate = new Date(day); endDate.setHours(parseInt(eh), parseInt(em), 0, 0);
                                            return currentTime >= startDate && currentTime <= endDate;
                                        })();

                                        const styleObj = period.course.color ? {
                                            bg: period.course.color + (isPast ? '60' : ''), // solid if active, transparent if past
                                            color: isPast ? '#524840' : '#ffffff',
                                            border: period.course.color
                                        } : getHashColor(period.id);

                                        return (
                                            <div
                                                key={`period-${period.id}-${index}`}
                                                className={`absolute px-1.5 py-1.5 rounded-lg cursor-pointer text-[10px] sm:text-[11px] transition-transform duration-150 overflow-hidden ${selectionMode ? 'hover:scale-100 ring-1 ring-red-300' : 'hover:-translate-y-px z-[2] hover:z-[10]'} ${isSelected ? 'ring-2 ring-red-500 opacity-100' : ''} ${isPast ? 'opacity-[0.6]' : 'shadow-sm'} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#d4a090] shadow-[0_0_15px_rgba(212,160,144,0.6)] z-[5] animate-pulse-slow' : ''}`}
                                                style={{
                                                    top: `${itemY}px`, height: `${pxHeight}px`,
                                                    left: itemStyles.get(item)?.left || '1px', width: itemStyles.get(item)?.width || 'calc(100% - 2px)',
                                                    backgroundColor: isPast ? Math.abs(getHashColor(period.id).bg.indexOf('var')) > -1 ? getHashColor(period.id).bg : styleObj.bg : styleObj.border, 
                                                    borderLeft: `3px solid ${isPast ? styleObj.border : 'rgba(255,255,255,0.4)'}`, 
                                                    color: isPast ? styleObj.color : '#ffffff',
                                                    opacity: selectionMode && !isSelected && selectedCourseIds.size > 0 ? 0.4 : undefined
                                                }}
                                                onClick={() => { if(selectionMode) toggleSelection(period.course.id, 'course'); else router.push(`/courses?edit=${period.course.id}`); }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="font-medium opacity-70 mb-0.5 text-[8.5px] sm:text-[9px] tracking-tight">{formatTime(period.startTime)}</div>
                                                    {selectionMode && (
                                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-red-300 bg-white/50'}`}>{isSelected && '✓'}</div>
                                                    )}
                                                </div>
                                                <div className={`font-medium text-[10.5px] leading-[1.2] line-clamp-2 ${isPast ? 'line-through' : ''}`}>{period.course.code ? `${period.course.code} - ${period.course.name}` : period.course.name}</div>
                                            </div>
                                        );
                                    } else if (item.type === 'block') {
                                        const wb = item.data;
                                        const styleObj = getHashColor(wb.task.id);
                                        const isSelected = selectedBlockIds.has(wb.id);
                                        const displayDuration = resizingBlockId === wb.id && resizingDuration !== null ? resizingDuration : wb.durationMinutes;
                                        let height = Math.max(28, displayDuration * PIXELS_PER_MINUTE);
                                        const sameBlocks = workBlocks.filter(b => b.task.id === wb.task.id).sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                                        const isMulti = sameBlocks.length > 1;
                                        const partNum = isMulti ? sameBlocks.findIndex(b => b.id === wb.id) + 1 : 0;
                                        const isPast = currentTime > addMinutes(parseISO(wb.startAt), wb.durationMinutes);
                                        const isDone = wb.task.status === 'done' || isPast;
                                        
                                        const isCurrent = (() => {
                                            const startDate = parseISO(wb.startAt);
                                            const endDate = addMinutes(startDate, wb.durationMinutes);
                                            return currentTime >= startDate && currentTime <= endDate && wb.task.status !== 'done';
                                        })();

                                        return (
                                            <div
                                                key={`block-${wb.id}-${index}`}
                                                draggable={!selectionMode && !resizingBlockId}
                                                onDragStart={(e) => handleDragStart(e, wb)}
                                                onDragEnd={handleDragEnd}
                                                className={`absolute px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] transition-transform duration-150 overflow-hidden ${selectionMode ? 'cursor-pointer hover:scale-100 ring-1 ring-blue-300' : 'cursor-grab active:cursor-grabbing hover:-translate-y-px z-[2] hover:z-[10]'} ${isSelected ? 'ring-2 ring-blue-500 opacity-100' : ''} ${isDone ? 'opacity-[0.6]' : 'shadow-sm'} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#d4a090] shadow-[0_0_15px_rgba(212,160,144,0.6)] z-[5] animate-pulse-slow' : ''}`}
                                                style={{
                                                    top: `${itemY}px`, height: `${height}px`,
                                                    left: itemStyles.get(item)?.left || '1px', width: itemStyles.get(item)?.width || 'calc(100% - 2px)',
                                                    backgroundColor: isDone ? styleObj.bg : styleObj.border, 
                                                    borderLeft: `3px solid ${isDone ? styleObj.border : 'rgba(255,255,255,0.4)'}`, 
                                                    color: isDone ? styleObj.color : '#ffffff',
                                                    opacity: selectionMode && !isSelected ? 0.4 : undefined
                                                }}
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if (wasResizingRef.current) return;
                                                    if(selectionMode) toggleSelection(wb.id, 'block'); else setSelectedBlock(wb); 
                                                }}
                                            >
                                                {isMulti && <div className="absolute top-0.5 right-[3px] bg-white/60 text-[#7a3850] text-[8.5px] font-bold px-[4px] py-[1px] rounded z-10">{partNum}/{sameBlocks.length}</div>}
                                                {selectionMode && (
                                                    <div className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full border flex items-center justify-center text-[8px] z-10 ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-blue-300 bg-white/50'}`}>{isSelected && '✓'}</div>
                                                )}
                                                <div className="font-medium opacity-70 mb-[1px] text-[8.5px] tracking-tight pointer-events-none">{format(parseISO(wb.startAt), 'h:mm a')}</div>
                                                {wb.task.course?.code && <div className="text-[8.5px] tracking-wide opacity-60 mb-[0.5px] pointer-events-none leading-none truncate">{wb.task.course.code}</div>}
                                                <div className={`font-medium leading-[1.2] text-[10.5px] line-clamp-3 pointer-events-none ${isDone ? 'line-through' : ''}`}>{wb.task.title}</div>
                                                {height >= 45 && <div className="text-[9px] opacity-60 mt-[2px] pointer-events-none">{displayDuration >= 60 ? `${Math.floor(displayDuration/60)}h ${displayDuration%60 > 0 ? displayDuration%60+'m' : ''}` : displayDuration+'m'}</div>}
                                                
                                                {!selectionMode && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/10 rounded-b transition-colors z-20" onPointerDown={(e) => handleResizeStart(e, wb)} onClick={(e) => e.stopPropagation()} />
                                                )}
                                            </div>
                                        );
                                    } else {
                                        const t = item.data;
                                        const isPast = currentTime > parseISO(t.dueAt!);
                                        const styleObj = getHashColor(t.id);
                                        
                                        if (!t.needsWorkBlocks && t.estimatedMinutes) {
                                            const displayDuration = t.estimatedMinutes;
                                            let height = Math.max(28, displayDuration * PIXELS_PER_MINUTE);
                                            const isDone = t.status === 'done' || currentTime > addMinutes(parseISO(t.dueAt!), t.estimatedMinutes);
                                            
                                            const isCurrent = (() => {
                                                const startDate = parseISO(t.dueAt!);
                                                const endDate = addMinutes(startDate, t.estimatedMinutes!);
                                                return currentTime >= startDate && currentTime <= endDate && t.status !== 'done';
                                            })();

                                            return (
                                                <div
                                                    key={`task-${t.id}-${index}`}
                                                    className={`absolute px-1.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] transition-transform duration-150 overflow-hidden cursor-pointer hover:-translate-y-px z-[3] hover:z-[10] ${isDone ? 'opacity-[0.6]' : 'shadow-sm'} ${isCurrent ? 'ring-2 ring-offset-1 ring-[#d4a090] shadow-[0_0_15px_rgba(212,160,144,0.6)] z-[5] animate-pulse-slow' : ''}`}
                                                    style={{
                                                        top: `${itemY}px`, height: `${height}px`,
                                                        left: itemStyles.get(item)?.left || '1px', width: itemStyles.get(item)?.width || 'calc(100% - 2px)',
                                                        backgroundColor: isDone ? styleObj.bg : styleObj.border, 
                                                        borderLeft: `3px solid ${isDone ? styleObj.border : 'rgba(255,255,255,0.4)'}`, 
                                                        color: isDone ? styleObj.color : '#ffffff'
                                                    }}
                                                    onClick={() => !selectionMode && setSelectedTask(t)}
                                                >
                                                    <div className="font-medium opacity-70 mb-[1px] text-[8.5px] tracking-tight pointer-events-none">{format(parseISO(t.dueAt!), 'h:mm a')}</div>
                                                    {t.course?.code && <div className="text-[8.5px] tracking-wide opacity-60 mb-[0.5px] pointer-events-none leading-none truncate">{t.course.code}</div>}
                                                    <div className={`font-medium leading-[1.2] text-[10.5px] line-clamp-3 pointer-events-none ${isDone ? 'line-through' : ''}`}>{t.title}</div>
                                                    {height >= 45 && <div className="text-[9px] opacity-60 mt-[2px] pointer-events-none">{displayDuration >= 60 ? `${Math.floor(displayDuration/60)}h ${displayDuration%60 > 0 ? displayDuration%60+'m' : ''}` : displayDuration+'m'}</div>}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={`task-${t.id}-${index}`}
                                                className={`absolute px-[9px] py-[3px] rounded-[12px] border-l-[3px] text-[10px] shadow-sm cursor-pointer flex items-center gap-1.5 overflow-hidden ${isPast || t.status === 'done' ? 'opacity-60 bg-bg-soft text-muted-soft border-line-soft' : 'hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(120,90,70,0.1)] z-[3] hover:z-[10]'}`}
                                                style={{
                                                    top: `${itemY-14}px`, height: '28px',
                                                    left: itemStyles.get(item)?.left || '4px', width: itemStyles.get(item)?.width || 'calc(100% - 8px)',
                                                    backgroundColor: (isPast || t.status === 'done') ? undefined : styleObj.bg,
                                                    borderLeft: (isPast || t.status === 'done') ? undefined : `3px solid ${styleObj.border}`,
                                                    color: (isPast || t.status === 'done') ? undefined : styleObj.color
                                                }}
                                                onClick={() => !selectionMode && setSelectedTask(t)}
                                            >
                                                <div className="font-bold opacity-60 flex-shrink-0 text-[9px] uppercase tracking-wide">Due</div>
                                                <div className={`truncate font-semibold ${isPast || t.status === 'done' ? 'line-through' : ''}`}>{format(parseISO(t.dueAt!), 'h:mm')} - {t.title}</div>
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
