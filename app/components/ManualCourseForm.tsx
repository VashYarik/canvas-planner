
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScheduleItem {
    id?: string;
    days: number[];
    startTime: string;
    endTime: string;
    location: string;
}

interface CourseData {
    id?: string;
    name: string;
    code: string;
    color: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    schedule: ScheduleItem[];
}

interface Props {
    initialData?: CourseData;
    onSuccess: () => void;
    onCancel?: () => void;
}

export default function ManualCourseForm({ initialData, onSuccess, onCancel }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CourseData>({
        name: '',
        code: '',
        color: '#3B82F6',
        startDate: '',
        endDate: '',
        schedule: []
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure dates are strings YYYY-MM-DD
                startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '',
                endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
            });
        }
    }, [initialData]);

    const addPeriod = () => {
        setFormData({
            ...formData,
            schedule: [...formData.schedule, { days: [1, 3, 5], startTime: '09:00', endTime: '10:15', location: '' }]
        });
    };

    const removePeriod = (index: number) => {
        setFormData({
            ...formData,
            schedule: formData.schedule.filter((_, i) => i !== index)
        });
    };

    const updatePeriod = (index: number, field: string, value: any) => {
        const newSchedule = [...formData.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setFormData({ ...formData, schedule: newSchedule });
    };

    const toggleDay = (index: number, day: number) => {
        const currentDays = formData.schedule[index].days;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day].sort();
        updatePeriod(index, 'days', newDays);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Flatten schedule for API
        const flattenedSchedule = formData.schedule.flatMap(item =>
            item.days.map(day => ({
                dayOfWeek: day,
                startTime: item.startTime,
                endTime: item.endTime,
                location: item.location
            }))
        );

        const payload = {
            name: formData.name,
            code: formData.code,
            color: formData.color,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            schedule: flattenedSchedule
        };

        try {
            const url = initialData?.id ? `/api/courses/${initialData.id}` : '/api/courses';
            const method = initialData?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save course');
            }

            onSuccess();
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id || !confirm('Are you sure you want to delete this course?')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/courses/${initialData.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Failed to delete course');
            }
            onSuccess();
            router.refresh();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const DAYS = [
        { label: 'S', value: 0 },
        { label: 'M', value: 1 },
        { label: 'T', value: 2 },
        { label: 'W', value: 3 },
        { label: 'T', value: 4 },
        { label: 'F', value: 5 },
        { label: 'S', value: 6 },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                    {initialData ? 'Edit Course' : 'Create New Course'}
                </h3>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                        Cancel
                    </button>
                )}
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Course Name</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Course Code</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Color</label>
                        <input
                            type="color"
                            className="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1 border"
                            value={formData.color || '#3B82F6'}
                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date</label>
                            <input
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">End Date</label>
                            <input
                                type="date"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Weekly Schedule</h3>
                    <button
                        type="button"
                        onClick={addPeriod}
                        className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                    >
                        + Add Class Meeting
                    </button>
                </div>

                {formData.schedule.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No class meetings added.</p>
                )}

                {formData.schedule.map((period, index) => (
                    <div key={index} className="border p-4 rounded-lg bg-gray-50 space-y-3 relative group">

                        <button
                            type="button"
                            onClick={() => removePeriod(index)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                            ✕
                        </button>

                        {/* Row 1: Days */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Days</label>
                            <div className="flex gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(index, day.value)}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${period.days.includes(day.value)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Time & Location */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Start Time</label>
                                <input
                                    type="time"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-1 border"
                                    value={period.startTime}
                                    onChange={e => updatePeriod(index, 'startTime', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">End Time</label>
                                <input
                                    type="time"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-1 border"
                                    value={period.endTime}
                                    onChange={e => updatePeriod(index, 'endTime', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Location</label>
                                <input
                                    type="text"
                                    placeholder="Room 101"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-1 border"
                                    value={period.location}
                                    onChange={e => updatePeriod(index, 'location', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="flex justify-between pt-4">
                {initialData?.id ? (
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition text-sm"
                    >
                        Delete Course
                    </button>
                ) : <div></div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Saving...' : (initialData ? 'Update Course' : 'Create Course')}
                </button>
            </div>
        </form>
    );
}
