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
        <div className="bg-surface-soft p-5 sm:p-6 rounded-2xl shadow-sm border border-line-soft">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer group"
            >
                <div>
                    <h3 className="text-[17px] font-lora font-medium text-text-soft group-hover:text-[#a37966] transition-colors">Detailed Availability</h3>
                    {isOpen && <p className="text-[13px] text-muted-soft mt-1.5 font-nunito font-medium">Define when you can work on assignments.</p>}
                </div>
                <svg
                    className={`w-5 h-5 text-[#a37966] transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="mt-8 space-y-6">
                    {DAYS.map((day, dayIndex) => {
                        const dayBlocks = blocks
                            .map((b, i) => ({ ...b, globalIndex: i }))
                            .filter((b) => b.dayOfWeek === dayIndex);

                        return (
                            <div key={day} className="border-b border-line-soft pb-5 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold text-text-soft sm:w-28 text-sm">{day}</span>
                                    <button
                                        onClick={() => addBlock(dayIndex)}
                                        className="text-xs font-bold bg-[#e8f0e8] text-[#3a5a38] px-3 py-1.5 rounded-full hover:bg-[#c0d6c0] transition-colors cursor-pointer"
                                    >
                                        + Add Block
                                    </button>
                                </div>

                                <div className="space-y-3 sm:ml-4">
                                    {dayBlocks.length === 0 && <span className="text-[13px] text-muted-soft italic font-medium">No availability defined</span>}
                                    {dayBlocks.map((block) => (
                                        <div key={block.globalIndex} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 bg-card-soft p-3 rounded-xl border border-line-soft sm:bg-transparent sm:border-transparent sm:p-0">
                                            <TimeSelect
                                                value={block.startTime}
                                                onChange={(val) => updateBlock(block.globalIndex, 'startTime', val)}
                                            />
                                            <span className="text-muted-soft hidden sm:inline px-1">&rarr;</span>
                                            <TimeSelect
                                                value={block.endTime}
                                                onChange={(val) => updateBlock(block.globalIndex, 'endTime', val)}
                                            />
                                            <div className="w-full sm:w-auto flex justify-end mt-2 sm:mt-0">
                                                <button
                                                    onClick={() => removeBlock(block.globalIndex)}
                                                    className="text-xs font-semibold text-red-400 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors sm:ml-2 cursor-pointer"
                                                    title="Remove"
                                                >
                                                    &times; Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <div className="mt-8 flex justify-end pt-4 border-t border-line-soft">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#a37966] text-white px-6 py-2.5 rounded-full hover:bg-[#8f6a5a] shadow-[0_3px_12px_rgba(163,121,102,0.3)] transition-all disabled:opacity-50 text-sm font-semibold cursor-pointer"
                        >
                            {saving ? 'Saving...' : 'Save Schedule'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
