'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

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
    const [title, setTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.dueAt ? format(new Date(task.dueAt), 'yyyy-MM-dd') : '');
    const [dueTime, setDueTime] = useState(task.dueAt ? format(new Date(task.dueAt), 'HH:mm') : '23:59');
    const [needsWorkBlocks, setNeedsWorkBlocks] = useState(task.needsWorkBlocks ?? true);
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
                    title: title || 'Untitled Task',
                    description: (description || '').trim() || null,
                    dueAt: dueDate && dueTime ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null,
                    needsWorkBlocks: !!needsWorkBlocks
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 font-nunito">
            <div className="absolute inset-0 bg-[#2b2523]/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-surface-soft border border-line-soft rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                <div className="px-5 pt-5 pb-4 border-b border-line-soft relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-bg-soft text-muted-soft hover:bg-card-soft transition-colors cursor-pointer text-lg">&times;</button>
                    
                    <h2 className="text-xl font-bold text-text-soft leading-tight tracking-tight pr-8">
                        {isEditing ? 'Edit Task' : 'Task Details'}
                    </h2>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add notes or details..."
                                    className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none min-h-[100px] resize-y custom-scrollbar"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Due Date</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Due Time</label>
                                    <input
                                        type="time"
                                        value={dueTime}
                                        onChange={(e) => setDueTime(e.target.value)}
                                        className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 pt-2">
                                <label className="relative flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={needsWorkBlocks}
                                        onChange={(e) => setNeedsWorkBlocks(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#a37966]"></div>
                                </label>
                                <span className="text-sm font-semibold text-text-soft">Auto-schedule work blocks</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg text-text-soft">{task.title}</h3>
                                {task.description && (
                                    <div className="mt-3 bg-bg-soft border-l-[3px] border-[#a37966] p-3 rounded-r-xl">
                                        <p className="text-muted-soft text-sm whitespace-pre-wrap leading-relaxed">{task.description}</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-4">
                                    <div className="text-xs font-bold uppercase tracking-wider text-muted-soft">Due:</div>
                                    <div className="text-sm font-medium text-text-soft">{task.dueAt ? format(new Date(task.dueAt), 'MMM d, yyyy • h:mm a') : 'No due date'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-line-soft flex items-center justify-between bg-surface-soft flex-shrink-0">
                    {!isEditing ? (
                        <>
                            <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-red-500 hover:bg-red-500/10 font-semibold rounded-xl text-sm transition-colors">Delete</button>
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-muted-soft hover:bg-bg-soft font-semibold rounded-xl text-sm transition-colors">Edit</button>
                                <button onClick={handleAddWorkBlock} disabled={loading} className="px-5 py-2 bg-[#a37966] text-white font-semibold rounded-xl text-sm hover:bg-[#8f6a5a] shadow-sm disabled:opacity-50 transition-colors">+ Block</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-full"></div>
                            <div className="flex gap-2 ml-auto">
                                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-muted-soft hover:bg-bg-soft font-semibold rounded-xl text-sm transition-colors">Cancel</button>
                                <button onClick={handleSave} disabled={loading} className="px-5 py-2 bg-[#a37966] text-white font-semibold rounded-xl text-sm hover:bg-[#8f6a5a] shadow-sm disabled:opacity-50 transition-colors">Save</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
