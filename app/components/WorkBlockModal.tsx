'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import TimeSelect from './TimeSelect';

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Edit Work Block</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="mb-4">
                    <h3 className="font-medium text-gray-700">{block.task.title}</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                            />
                            <TimeSelect
                                value={startTime}
                                onChange={(val) => setStartTime(val)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                        />
                    </div>

                    <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
                        <button onClick={handleDelete} disabled={loading} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg mr-auto">Delete</button>
                        <button onClick={onClose} className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={handleSave} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
                    </div>
                </div>
            </div>
        </div >
    );
}
