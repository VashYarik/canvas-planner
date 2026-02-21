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
    task: { id: string; title: string; dueAt?: string; course?: { color: string | null }; status?: string };
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

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isAddingBlock, setIsAddingBlock] = useState(false);
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

    const [isDragging, setIsDragging] = useState(false);
    const dragTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, block: WorkBlock) => {
        setIsDragging(true);
        e.dataTransfer.setData('blockId', block.id);
        e.dataTransfer.setData('originalStart', block.startAt);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleEdgeDragOver = (e: React.DragEvent, weeksOffset: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

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
        // Add 7 days * offset
        const newStart = addDays(originalStart, 7 * weeksOffset);

        // Auto-navigate to the new week
        setCurrentWeekStart(startOfWeek(addDays(currentWeekStart, 7 * weeksOffset), { weekStartsOn: 1 }));

        // Optimistic UI Update
        // We remove it from current view effectively if we change the date to outside current week
        // But we should update the state to reflect the new date
        const blockToUpdate = workBlocks.find(b => b.id === blockId);
        if (blockToUpdate) {
            const updatedBlock = { ...blockToUpdate, startAt: newStart.toISOString() };
            // If we move it out of view, we might want to just let it disappear or stay in state but not render
            handleBlockUpdate(updatedBlock);

            try {
                const res = await fetch(`/api/blocks/${blockId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startAt: newStart.toISOString() })
                });
                if (res.ok) {
                    router.refresh();
                }
            } catch (error) {
                console.error("Failed to update block position", error);
            }
        }
    };

    const handleDrop = async (e: React.DragEvent, targetDay: Date) => {
        e.preventDefault();
        setIsDragging(false);
        e.dataTransfer.dropEffect = 'move';
        const blockId = e.dataTransfer.getData('blockId');
        const originalStartStr = e.dataTransfer.getData('originalStart');

        if (!blockId || !originalStartStr) return;

        const originalStart = new Date(originalStartStr);

        // Construct new start time: Target Day + Original Time
        const newStart = new Date(targetDay);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

        // Optimistic UI Update
        const blockToUpdate = workBlocks.find(b => b.id === blockId);
        if (blockToUpdate) {
            // Check if past due date
            if (blockToUpdate.task.dueAt && isAfter(newStart, parseISO(blockToUpdate.task.dueAt))) {
                const confirmed = window.confirm(`Warning: You are moving this workblock past the task's due date (${format(parseISO(blockToUpdate.task.dueAt), 'MMM d, h:mm a')}).\n\nAre you sure you want to disregard the deadline and keep it here?`);
                if (!confirmed) {
                    return; // Abort drop, let it snap back
                }
            }

            const updatedBlock = { ...blockToUpdate, startAt: newStart.toISOString() };
            handleBlockUpdate(updatedBlock);

            try {
                const res = await fetch(`/api/blocks/${blockId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startAt: newStart.toISOString() })
                });
                if (res.ok) {
                    router.refresh();
                }
            } catch (error) {
                console.error("Failed to update block position", error);
            }
        }
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
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

            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        {format(currentWeekStart, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
                        <button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Today</button>
                        <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Filters */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setShowCourses(!showCourses)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${showCourses ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Courses
                        </button>
                        <button
                            onClick={() => setShowTasks(!showTasks)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${showTasks ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Tasks
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            disabled={selectionMode}
                            onClick={async () => {
                                if (selectionMode) return;
                                if (confirm("Rearrange schedule based on your class periods?")) {
                                    try {
                                        const res = await fetch('/api/plan/generate', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ mode: 'update' })
                                        });
                                        if (res.ok) {
                                            router.refresh();
                                        } else {
                                            alert("Failed to update schedule");
                                        }
                                    } catch (e) {
                                        alert("Error updating schedule");
                                    }
                                }
                            }}
                            className={`text-sm px-3 py-1 rounded-lg shadow-sm transition-colors ${selectionMode ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            Update Schedule
                        </button>

                        <button
                            onClick={() => {
                                setSelectionMode(!selectionMode);
                                setSelectedBlockIds(new Set());
                                setSelectedCourseIds(new Set());
                            }}
                            className={`text-sm px-3 py-1 border rounded-lg transition-colors ${selectionMode
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'text-gray-600 hover:bg-gray-50 border-gray-200'
                                }`}
                        >
                            {selectionMode ? 'Cancel Selection' : 'Select Items'}
                        </button>

                        {selectionMode && (selectedBlockIds.size > 0 || selectedCourseIds.size > 0) && (
                            <button
                                onClick={handleBulkDelete}
                                className="text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 shadow-sm"
                            >
                                Delete Selected ({selectedBlockIds.size + selectedCourseIds.size})
                            </button>
                        )}

                        {!selectionMode && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsAddingBlock(!isAddingBlock)}
                                    className={`text-sm px-3 py-1 border rounded-lg transition-colors ${isAddingBlock ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                                >
                                    Add Block +
                                </button>

                                {isAddingBlock && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                                        <div className="p-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select a Task</h3>
                                        </div>
                                        <div className="p-1">
                                            {tasks.filter(t => t.status !== 'done').length === 0 ? (
                                                <div className="p-3 text-sm text-gray-500 text-center">No active tasks</div>
                                            ) : (
                                                tasks.filter(t => t.status !== 'done').map(task => (
                                                    <button
                                                        key={task.id}
                                                        onClick={async () => {
                                                            setIsAddingBlock(false);
                                                            try {
                                                                const defaultDate = new Date();
                                                                defaultDate.setDate(defaultDate.getDate() + 1);
                                                                defaultDate.setHours(9, 0, 0, 0);

                                                                const newTaskRes = await fetch('/api/blocks', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        taskId: task.id,
                                                                        startAt: defaultDate.toISOString(),
                                                                        durationMinutes: 60
                                                                    })
                                                                });

                                                                if (!newTaskRes.ok) throw new Error('Failed to create block');

                                                                const createdBlock = await newTaskRes.json();

                                                                // Navigate to the week containing the new block
                                                                setCurrentWeekStart(startOfWeek(defaultDate, { weekStartsOn: 1 }));

                                                                // Trigger highlight
                                                                setNewlyAddedBlockId(createdBlock.id);
                                                                setTimeout(() => setNewlyAddedBlockId(null), 3000);

                                                                router.refresh();
                                                            } catch (error) {
                                                                console.error(error);
                                                                alert('Failed to add work block');
                                                            }
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded-md transition-colors truncate"
                                                    >
                                                        <span className="font-medium text-gray-800">{task.title}</span>
                                                        {task.course && <span className="ml-2 text-[10px] text-gray-500 bg-gray-100 px-1 rounded uppercase">{task.course.code}</span>}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectionMode && (
                            <button
                                onClick={async () => {
                                    if (confirm('Clear ALL items from the calendar?\n\nThis will remove the schedule but keep your Courses and Tasks in the database.')) {
                                        await fetch('/api/plan', { method: 'DELETE' });
                                        window.location.reload();
                                    }
                                }}
                                className="text-sm text-red-600 hover:text-red-800 px-3 py-1 border border-red-200 rounded-lg hover:bg-red-50"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Drop Zones for Cross-Week Dragging */}
            {isDragging && (
                <>
                    <div
                        className="absolute top-0 left-0 w-16 h-full bg-blue-100/80 z-20 flex items-center justify-center border-r-2 border-blue-300 rounded-l-xl transition-all hover:bg-blue-200"
                        onDragOver={(e) => handleEdgeDragOver(e, -1)}
                        onDragLeave={handleEdgeDragLeave}
                        onDrop={(e) => handleWeekDrop(e, -1)}
                    >
                        <span className="transform -rotate-90 font-bold text-blue-700 whitespace-nowrap pointer-events-none">← Prev Week</span>
                    </div>
                    <div
                        className="absolute top-0 right-0 w-16 h-full bg-blue-100/80 z-20 flex items-center justify-center border-l-2 border-blue-300 rounded-r-xl transition-all hover:bg-blue-200"
                        onDragOver={(e) => handleEdgeDragOver(e, 1)}
                        onDragLeave={handleEdgeDragLeave}
                        onDrop={(e) => handleWeekDrop(e, 1)}
                    >
                        <span className="transform rotate-90 font-bold text-blue-700 whitespace-nowrap pointer-events-none">Next Week →</span>
                    </div>
                </>
            )}

            <div className="grid grid-cols-7 gap-4 min-h-[500px]">
                {days.map(day => (
                    <div
                        key={day.toISOString()}
                        className="flex flex-col gap-2 rounded-lg transition-colors group"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day)}
                    >
                        <div className={`p-2 rounded-lg text-center ${isSameDay(day, new Date()) ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-gray-50 text-gray-600'}`}>
                            <div className="text-xs uppercase opacity-75">{format(day, 'EEE')}</div>
                            <div className="text-lg">{format(day, 'd')}</div>
                        </div>

                        <div className="flex-1 space-y-2 p-1 rounded-lg group-hover:bg-gray-50/50 min-h-[100px]">
                            {(() => {
                                type CalendarItem =
                                    | { type: 'period'; data: ClassPeriod; time: Date }
                                    | { type: 'block'; data: WorkBlock; time: Date }
                                    | { type: 'task'; data: Task; time: Date };

                                const items: CalendarItem[] = [];

                                if (showCourses) {
                                    const periods = getPeriodsForDay(day);
                                    items.push(...periods.map(p => {
                                        const [h, m] = p.startTime.split(':');
                                        const d = new Date(day);
                                        d.setHours(parseInt(h), parseInt(m), 0, 0);
                                        return { type: 'period' as const, data: p, time: d };
                                    }));
                                }

                                if (showTasks) {
                                    workBlocks
                                        .filter(wb => isSameDay(parseISO(wb.startAt), day))
                                        .forEach(wb => {
                                            items.push({ type: 'block' as const, data: wb, time: parseISO(wb.startAt) });
                                        });

                                    tasks
                                        .filter(t => t.dueAt && isSameDay(parseISO(t.dueAt), day))
                                        .forEach(t => {
                                            items.push({ type: 'task' as const, data: t, time: parseISO(t.dueAt!) });
                                        });
                                }

                                items.sort((a, b) => a.time.getTime() - b.time.getTime());

                                return items.map(item => {
                                    if (item.type === 'period') {
                                        const period = item.data;
                                        const isSelected = selectedCourseIds.has(period.course.id);
                                        const formatTime = (t: string) => {
                                            const [h, m] = t.split(':');
                                            const date = new Date();
                                            date.setHours(parseInt(h), parseInt(m));
                                            return format(date, 'h:mm a');
                                        };
                                        return (
                                            <div
                                                key={`period-${period.id}`}
                                                className={`p-2 rounded text-xs border-l-4 shadow-sm transition-all ${selectionMode
                                                    ? 'cursor-pointer hover:opacity-100 border-t border-r border-b border-dashed border-red-300 hover:bg-red-50'
                                                    : 'cursor-pointer opacity-90 hover:opacity-100'
                                                    } ${isSelected ? 'ring-2 ring-red-600 ring-offset-1 opacity-100 bg-red-100' : ''}`}
                                                style={{
                                                    backgroundColor: selectionMode ? undefined : (`${period.course.color}20` || '#EBF5FF'),
                                                    borderLeftColor: period.course.color || '#3B82F6',
                                                    color: '#374151',
                                                    opacity: selectionMode && !isSelected && selectedCourseIds.size > 0 ? 0.5 : undefined
                                                }}
                                                onClick={() => {
                                                    if (selectionMode) {
                                                        toggleSelection(period.course.id, 'course');
                                                    } else {
                                                        router.push(`/courses?edit=${period.course.id}`);
                                                    }
                                                }}
                                            >
                                                <div className="font-bold flex justify-between items-start">
                                                    <span>{formatTime(period.startTime)}</span>
                                                    {selectionMode ? (
                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-red-300 bg-white'}`}>
                                                            {isSelected && '✓'}
                                                        </div>
                                                    ) : (
                                                        <span className="opacity-50 text-[10px]">{period.course.code}</span>
                                                    )}
                                                </div>
                                                <div className="font-medium truncate">{period.course.name}</div>
                                                {period.location && <div className="text-[10px] text-gray-500 truncate">📍 {period.location}</div>}
                                            </div>
                                        );
                                    } else if (item.type === 'block') {
                                        const wb = item.data;
                                        const isSelected = selectedBlockIds.has(wb.id);
                                        const isNewlyAdded = newlyAddedBlockId === wb.id;
                                        const blockStart = parseISO(wb.startAt);
                                        const blockEnd = addMinutes(blockStart, wb.durationMinutes);
                                        const isActive = currentTime >= blockStart && currentTime <= blockEnd;

                                        const sameTaskBlocks = workBlocks.filter(b => b.task.id === wb.task.id).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
                                        const isMultiBlock = sameTaskBlocks.length > 1;
                                        const blockPartNum = isMultiBlock ? sameTaskBlocks.findIndex(b => b.id === wb.id) + 1 : 0;

                                        return (
                                            <div
                                                key={`block-${wb.id}`}
                                                draggable={!selectionMode}
                                                onDragStart={(e) => handleDragStart(e, wb)}
                                                onDragEnd={handleDragEnd}
                                                className={`relative p-2 rounded text-xs text-white shadow-sm transition-all duration-300 ${selectionMode
                                                    ? 'cursor-pointer hover:opacity-100'
                                                    : 'cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:opacity-100'
                                                    } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 opacity-100' : 'opacity-90'} 
                                                    ${isActive ? 'ring-4 ring-yellow-400 ring-offset-2 animate-pulse shadow-lg z-10' : ''}
                                                    ${isNewlyAdded ? 'ring-4 ring-green-400 ring-offset-2 scale-105 shadow-xl z-20 transition-transform' : ''}`}
                                                style={{
                                                    backgroundColor: wb.task.course?.color || '#3B82F6',
                                                    opacity: selectionMode && !isSelected ? 0.5 : undefined
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectionMode) {
                                                        toggleSelection(wb.id, 'block');
                                                    } else {
                                                        setSelectedBlock(wb);
                                                    }
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="font-bold opacity-75">{format(parseISO(wb.startAt), 'h:mm a')}</div>
                                                    {selectionMode && (
                                                        <div className={`w-4 h-4 rounded-full border border-white flex items-center justify-center ${isSelected ? 'bg-white text-blue-600' : ''}`}>
                                                            {isSelected && '✓'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`font-medium truncate ${wb.task.status === 'done' ? 'line-through opacity-75' : ''} pr-4`}>
                                                    {wb.task.title}
                                                </div>
                                                <div className="opacity-75">
                                                    {wb.durationMinutes >= 60
                                                        ? `${Math.floor(wb.durationMinutes / 60)}h ${wb.durationMinutes % 60 > 0 ? `${wb.durationMinutes % 60}m` : ''}`
                                                        : `${wb.durationMinutes}m`}
                                                </div>
                                                {isMultiBlock && (
                                                    <div className="absolute bottom-1 right-1.5 text-[9px] bg-black/20 font-bold px-1 py-0.5 rounded backdrop-blur-sm shadow-sm">
                                                        {blockPartNum}/{sameTaskBlocks.length}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        const t = item.data;
                                        const isDone = t.status === 'done';
                                        return (
                                            <div
                                                key={`task-${t.id}`}
                                                className={`p-2 rounded border text-xs shadow-sm cursor-pointer ${isDone ? 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 opacity-75' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
                                                onClick={() => !selectionMode && setSelectedTask(t)}
                                            >
                                                <div className="font-bold uppercase text-[10px]">Due</div>
                                                <div className={`font-medium truncate ${isDone ? 'line-through' : ''}`}>{format(parseISO(t.dueAt!), 'h:mm a')} - {t.title}</div>
                                            </div>
                                        );
                                    }
                                });
                            })()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
