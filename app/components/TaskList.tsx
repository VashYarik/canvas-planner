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
        // if (!confirm('Are you sure?')) return; // User requested no confirmation
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            onUpdate();
        } catch (error) {
            console.error('Failed to delete', error);
        }
    }

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
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 flex justify-between items-center ${task.status === 'done' ? 'border-green-400 opacity-60' : 'border-blue-500'
                }`}
        >
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    {task.course ? (
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {task.course.code}
                        </span>
                    ) : null}
                    <h3 className={`font-medium text-gray-900 ${task.status === 'done' ? 'line-through' : ''}`}>
                        {task.title}
                    </h3>
                </div>
                <div className="text-sm text-gray-500 flex gap-4">
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

            <div className="flex items-center gap-2">
                {task.status !== 'done' && (
                    <button
                        onClick={() => handleStatusChange(task.id, 'done')}
                        className="text-sm bg-gray-100 hover:bg-green-100 text-green-700 px-3 py-1 rounded-full transition"
                    >
                        Done
                    </button>
                )}
                {task.status === 'done' && (
                    <button
                        onClick={() => handleStatusChange(task.id, 'todo')}
                        className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full transition"
                    >
                        Undo
                    </button>
                )}
                <button
                    onClick={() => setEditingTask(task)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition ml-2"
                >
                    Edit
                </button>
                <button
                    onClick={() => handleDelete(task.id)}
                    className="text-gray-300 hover:text-red-500 ml-2"
                    title="Delete"
                >
                    &times;
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {schoolTasks.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">School Tasks</h3>
                    <div className="space-y-3">
                        {schoolTasks.map(renderTask)}
                    </div>
                </div>
            )}

            {personalTasks.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Personal Tasks</h3>
                    <div className="space-y-3">
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
        </div>
    );
}
