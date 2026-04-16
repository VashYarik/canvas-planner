'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';

type WorkBlock = {
    id: string;
    startAt: string; // ISO
    durationMinutes: number;
    task: { id: string; title: string };
};

type Props = {
    block: WorkBlock;
    onClose: () => void;
    onUpdate: (block: WorkBlock) => void;
    onDelete: (blockId: string) => void;
};

export default function WorkBlockModal({ block, onClose, onUpdate, onDelete }: Props) {
    const router = useRouter();
    const [startDate, setStartDate] = useState(
        block.startAt ? format(parseISO(block.startAt), "yyyy-MM-dd") : ''
    );
    const [startTime, setStartTime] = useState(
        block.startAt ? format(parseISO(block.startAt), "HH:mm") : '12:00'
    );
    const [duration, setDuration] = useState<number | ''>(block.durationMinutes);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/blocks/${block.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startAt: startDate && startTime ? new Date(`${startDate}T${startTime}:00`).toISOString() : null,
                    durationMinutes: duration === '' ? 0 : duration
                })
            });

            if (!res.ok) throw new Error('Failed to update');

            const updatedBlock = await res.json();
            // Ensure the returned block has the task structure we need, or merge it
            onUpdate({ ...block, ...updatedBlock });
            router.refresh();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this work block?')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/blocks/${block.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            onDelete(block.id);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to delete block');
            setLoading(false);
        }
    };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0 font-nunito">
            <div className="absolute inset-0 bg-[#2b2523]/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm bg-surface-soft border border-line-soft rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                <div className="px-5 pt-5 pb-4 border-b border-line-soft relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-bg-soft text-muted-soft hover:bg-card-soft transition-colors cursor-pointer text-lg">&times;</button>

                    <h2 className="text-xl font-bold text-text-soft leading-tight tracking-tight pr-8">Edit Work Block</h2>
                    <div className="text-muted-soft text-sm mt-1.5 font-medium line-clamp-1">
                        {block.task.title}
                    </div>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-muted-soft uppercase tracking-wider mb-1.5">Duration (min)</label>
                        <input
                            type="number"
                            min="1"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="block w-full rounded-xl border border-line-soft bg-bg-soft text-text-soft focus:border-[#a37966] focus:ring-1 focus:ring-[#a37966] p-2.5 text-sm transition-colors outline-none"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-line-soft flex items-center justify-between bg-surface-soft flex-shrink-0">
                    <button onClick={handleDelete} disabled={loading} className="px-4 py-2 text-red-500 hover:bg-red-500/10 font-semibold rounded-xl text-sm transition-colors">Delete</button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-muted-soft hover:bg-bg-soft font-semibold rounded-xl text-sm transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={loading} className="px-5 py-2 bg-[#a37966] text-white font-semibold rounded-xl text-sm hover:bg-[#8f6a5a] shadow-sm disabled:opacity-50 transition-colors">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
