'use client';

import { useState, useEffect } from 'react';
import TimeSelect from './TimeSelect';

type AvailabilityBlock = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilitySettings() {
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false); // Default collapsed

    useEffect(() => {
        fetch('/api/availability')
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setBlocks(data);
                setLoading(false);
            })
            .catch(console.error);
    }, []);

    const addBlock = (dayIndex: number) => {
        setBlocks([...blocks, { dayOfWeek: dayIndex, startTime: '09:00', endTime: '12:00' }]);
    };

    const removeBlock = (index: number) => {
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        setBlocks(newBlocks);
    };

    const updateBlock = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], [field]: value };
        setBlocks(newBlocks);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks }),
            });
            if (res.ok) alert('Saved availability!');
            else alert('Failed to save');
        } catch (err) {
            alert('Error saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-left focus:outline-none"
            >
                <div>
                    <h3 className="text-lg font-semibold text-gray-700">Detailed Availability</h3>
                    {isOpen && <p className="text-sm text-gray-500 mt-1">Define when you can work on assignments.</p>}
                </div>
                <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="mt-6 space-y-6">
                    {DAYS.map((day, dayIndex) => {
                        const dayBlocks = blocks
                            .map((b, i) => ({ ...b, globalIndex: i }))
                            .filter((b) => b.dayOfWeek === dayIndex);

                        return (
                            <div key={day} className="border-b border-gray-50 pb-4 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-700 w-24">{day}</span>
                                    <button
                                        onClick={() => addBlock(dayIndex)}
                                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                                    >
                                        + Add Block
                                    </button>
                                </div>

                                <div className="space-y-2 ml-4">
                                    {dayBlocks.length === 0 && <span className="text-xs text-gray-400 italic">No availability</span>}
                                    {dayBlocks.map((block) => (
                                        <div key={block.globalIndex} className="flex items-center gap-2">
                                            <TimeSelect
                                                value={block.startTime}
                                                onChange={(val) => updateBlock(block.globalIndex, 'startTime', val)}
                                            />
                                            <span className="text-gray-400">-</span>
                                            <TimeSelect
                                                value={block.endTime}
                                                onChange={(val) => updateBlock(block.globalIndex, 'endTime', val)}
                                            />
                                            <button
                                                onClick={() => removeBlock(block.globalIndex)}
                                                className="text-red-400 hover:text-red-600 ml-2"
                                                title="Remove"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                        >
                            {saving ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
