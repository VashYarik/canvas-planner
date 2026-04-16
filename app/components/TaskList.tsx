'use client';

import { useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import TaskDetailsModal from './TaskDetailsModal';

type Task = {
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
    estimatedMinutes: number | null;
    difficulty: string | null;
    description: string | null;
    needsWorkBlocks: boolean;
    course?: { code: string; color: string | null };
    workBlocks?: { startAt: string }[];
};

export default function TaskList({ tasks, onUpdate }: { tasks: Task[]; onUpdate: () => void }) {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    const handleStatusChange = async (taskId: string, newStatus: string) => {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleDelete = async (taskId: string) => {
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            onUpdate();
        } catch (error) {
            console.error('Failed to delete', error);
        }
    }

    const handleBulkDelete = async () => {
        setIsDeleting(true);
        try {
            await Promise.all(
                Array.from(selectedTaskIds).map(id => fetch(`/api/tasks/${id}`, { method: 'DELETE' }))
            );
            setSelectedTaskIds(new Set());
            onUpdate();
        } catch (error) {
            console.error('Failed to bulk delete', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (tasks.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                No tasks found. Create one to get started!
            </div>
        );
    }

    const schoolTasks = tasks.filter(t => t.course);
    const personalTasks = tasks.filter(t => !t.course);

    const renderTask = (task: Task) => (
        <div
            key={task.id}
            className={`p-5 rounded-2xl shadow-sm border-l-[3px] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-200 group relative
                ${task.status === 'done'
                    ? 'bg-bg-soft border-line-soft opacity-60'
                    : 'bg-card-soft border-[#d4a090] hover:shadow-md hover:-translate-y-1'
                } ${selectedTaskIds.has(task.id) ? 'ring-2 ring-[#d4a090] bg-[#fcf8f7]' : ''}`}
        >
            <div className="flex items-start sm:items-center flex-1">
                <label className="pt-1 sm:pt-0 cursor-pointer pl-3 pr-4 py-3 -my-3 -ml-3 flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={selectedTaskIds.has(task.id)}
                        onChange={(e) => {
                            const newSet = new Set(selectedTaskIds);
                            if (e.target.checked) newSet.add(task.id);
                            else newSet.delete(task.id);
                            setSelectedTaskIds(newSet);
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-[#a37966] focus:ring-[#d4a090] cursor-pointer accent-[#a37966]"
                    />
                </label>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        {task.course ? (
                            <span
                                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full shadow-sm"
                                style={{ backgroundColor: task.course.color || '#a37966' }}
                            >
                                {task.course.code}
                            </span>
                        ) : null}
                        <h3 className={`font-lora font-medium text-lg leading-tight group-hover:text-[#a37966] transition-colors ${task.status === 'done' ? 'line-through text-muted-soft' : 'text-text-soft'}`}>
                            {task.title}
                        </h3>
                    </div>
                    <div className="text-sm font-nunito font-medium flex flex-wrap gap-x-5 gap-y-2 mt-2">
                        {task.dueAt ? (
                            <span className={new Date(task.dueAt) < new Date() && task.status !== 'done' ? 'text-red-500 font-semibold' : ''}>
                                Due: {format(new Date(task.dueAt), 'EEE, MMM d, h:mm a')}
                                {(() => {
                                    const due = new Date(task.dueAt!);
                                    const now = new Date();
                                    const diffDays = differenceInCalendarDays(due, now);

                                    if (task.status === 'done') return null;

                                    if (diffDays < 0) {
                                        return <span className="ml-2 text-red-600 font-bold">({Math.abs(diffDays)} days overdue)</span>;
                                    } else if (diffDays === 0) {
                                        return <span className="ml-2 text-orange-500 font-bold">(Due today)</span>;
                                    } else {
                                        return <span className="ml-2 text-gray-500">({diffDays} days left)</span>;
                                    }
                                })()}
                            </span>
                        ) : (
                            // If no due date, check for planned work blocks (for personal tasks)
                            !task.course && task.workBlocks && task.workBlocks.length > 0 && task.status !== 'done' ? (
                                <span className="text-blue-600 font-medium">
                                    Planned for: {format(new Date(task.workBlocks[0].startAt), 'EEE, MMM d, h:mm a')}
                                </span>
                            ) : null
                        )}
                        {task.estimatedMinutes && (
                            <span>
                                {task.estimatedMinutes >= 60
                                    ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 > 0 ? `${task.estimatedMinutes % 60}m` : ''}`
                                    : `${task.estimatedMinutes}m`}
                            </span>
                        )}
                        {task.difficulty && <span className="capitalize text-gray-400">({task.difficulty})</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 pl-9 sm:pl-0">
                {task.status !== 'done' && (
                    <button
                        onClick={() => handleStatusChange(task.id, 'done')}
                        className="text-xs font-semibold bg-[#e8f0e8] hover:bg-[#c0d6c0] text-[#3a5a38] px-4 py-2 rounded-full transition-colors cursor-pointer"
                    >
                        ✓ Done
                    </button>
                )}
                {task.status === 'done' && (
                    <button
                        onClick={() => handleStatusChange(task.id, 'todo')}
                        className="text-xs font-semibold bg-bg-soft hover:bg-card-soft text-muted-soft border border-line-soft px-4 py-2 rounded-full transition-colors cursor-pointer"
                    >
                        ⎌ Undo
                    </button>
                )}
                <button
                    onClick={() => setEditingTask(task)}
                    className="text-xs font-semibold bg-transparent hover:bg-bg-soft text-text-soft border border-line-soft px-4 py-2 rounded-full transition-colors cursor-pointer"
                >
                    Edit
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-10 relative pb-24">
            {schoolTasks.length > 0 && (
                <div className="bg-surface-soft p-4 sm:p-6 rounded-2xl border border-line-soft shadow-sm">
                    <h3 className="text-xl font-lora font-medium text-text-soft mb-5 border-b border-line-soft pb-3">School</h3>
                    <div className="space-y-4">
                        {schoolTasks.map(renderTask)}
                    </div>
                </div>
            )}

            {personalTasks.length > 0 && (
                <div className="bg-surface-soft p-4 sm:p-6 rounded-2xl border border-line-soft shadow-sm">
                    <h3 className="text-xl font-lora font-medium text-text-soft mb-5 border-b border-line-soft pb-3">Personal</h3>
                    <div className="space-y-4">
                        {personalTasks.map(renderTask)}
                    </div>
                </div>
            )}

            {editingTask && (
                <TaskDetailsModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onUpdate={() => {
                        setEditingTask(null);
                        onUpdate();
                    }}
                    onDelete={(id) => {
                        handleDelete(id);
                        setEditingTask(null);
                    }}
                />
            )}

            {selectedTaskIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white px-6 py-4 rounded-full shadow-lg border border-[#a37966]/20 flex items-center gap-6 z-50 transition-all duration-300">
                    <span className="font-semibold text-gray-800">
                        {selectedTaskIds.size} task{selectedTaskIds.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-5 py-2 rounded-full font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Selected'}
                    </button>
                </div>
            )}
        </div>
    );
}
