'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import TimeSelect from './TimeSelect';

type Task = {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    status: string;
    estimatedMinutes: number | null;
    needsWorkBlocks: boolean;
};

type Props = {
    task: Task;
    onClose: () => void;
    onUpdate: (task: Task) => void;
    onDelete: (taskId: string) => void;
};

export default function TaskDetailsModal({ task, onClose, onUpdate, onDelete }: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.dueAt ? format(new Date(task.dueAt), 'yyyy-MM-dd') : '');
    const [dueTime, setDueTime] = useState(task.dueAt ? format(new Date(task.dueAt), 'HH:mm') : '23:59');
    const [needsWorkBlocks, setNeedsWorkBlocks] = useState(task.needsWorkBlocks);
    const [loading, setLoading] = useState(false);

    const handleAddWorkBlock = async () => {
        setLoading(true);
        try {
            // Default to tomorrow 9 AM so it's visible or today if due later
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 1);
            defaultDate.setHours(9, 0, 0, 0);

            const res = await fetch('/api/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    startAt: defaultDate.toISOString(),
                    durationMinutes: 60
                })
            });

            if (!res.ok) throw new Error('Failed to create block');

            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to add work block');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description: description.trim() || null,
                    dueAt: dueDate && dueTime ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null,
                    needsWorkBlocks
                })
            });

            if (!res.ok) throw new Error('Failed to update');

            const updatedTask = await res.json();
            onUpdate(updatedTask);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            onDelete(task.id);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to delete task');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Task Details</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add notes or details..."
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 min-h-[100px] text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                                <TimeSelect
                                    value={dueTime}
                                    onChange={(val) => setDueTime(val)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="edit-needsWorkBlocks"
                                type="checkbox"
                                checked={needsWorkBlocks}
                                onChange={(e) => setNeedsWorkBlocks(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="edit-needsWorkBlocks" className="ml-2 block text-sm text-gray-900">
                                Auto-schedule work blocks
                            </label>
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => setIsEditing(false)} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={handleSave} disabled={loading} className="px-3 py-2 bg-ocean text-white rounded-lg hover:opacity-90 disabled:opacity-50">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            {task.description && (
                                <div className="mt-3 bg-blue-50/50 border-l-4 border-blue-400 p-3 rounded-r-md">
                                    <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mt-4">
                                Due: {task.dueAt ? format(new Date(task.dueAt), 'PPpp') : 'No due date'}
                            </p>
                            {task.status && <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 mt-2 capitalize">{task.status}</span>}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                            <button onClick={handleAddWorkBlock} disabled={loading} className="flex-1 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100">Add Block</button>
                            <button onClick={() => setIsEditing(true)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Edit</button>
                            <button onClick={handleDelete} disabled={loading} className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Delete</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
