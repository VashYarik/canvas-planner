'use client';

import { useState } from 'react';
import TimeSelect from './TimeSelect';

export default function TaskForm({ onSuccess }: { onSuccess: () => void }) {
    const now = new Date();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [month, setMonth] = useState(now.getMonth());
    const [day, setDay] = useState(now.getDate());
    const [time, setTime] = useState('23:59');
    const [estimatedMinutes, setEstimatedMinutes] = useState('');
    const [difficulty, setDifficulty] = useState('med');
    const [needsWorkBlocks, setNeedsWorkBlocks] = useState(true);
    const [loading, setLoading] = useState(false);

    // New state for task type
    const [isSchoolTask, setIsSchoolTask] = useState(true);
    const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [coursesLoaded, setCoursesLoaded] = useState(false);

    // Fetch courses on mount
    useState(() => {
        fetch('/api/courses')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCourses(data);
                    if (data.length > 0) setSelectedCourseId(data[0].id);
                }
                setCoursesLoaded(true);
            })
            .catch(err => console.error("Failed to load courses", err));
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Calculate Year logic
        const currentYear = new Date().getFullYear();
        let targetYear = currentYear;
        // Construct a candidate date for this year
        const candidateDate = new Date(currentYear, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for comparison

        // If the month/day is in the past relative to today, assume next year
        if (candidateDate < today) {
            targetYear += 1;
        }

        const [hours, minutes] = time.split(':').map(Number);
        const dueAt = new Date(targetYear, month, day, hours, minutes);

        try {
            const payload: any = {
                title,
                description: description.trim() || null,
                dueAt: dueAt.toISOString(),
                estimatedMinutes: estimatedMinutes || null,
                difficulty,
                needsWorkBlocks,
            };

            if (isSchoolTask && selectedCourseId) {
                payload.courseId = selectedCourseId;
            }

            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setTitle('');
                setDescription('');
                // Reset to today
                const resetDate = new Date();
                setMonth(resetDate.getMonth());
                setDay(resetDate.getDate());
                setTime('23:59');
                setEstimatedMinutes('');
                setDifficulty('med');
                setNeedsWorkBlocks(true);
                onSuccess();
            } else {
                alert('Failed to create task');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Task Title</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none"
                    placeholder="e.g. Math Homework"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border min-h-[100px] transition-colors outline-none"
                    placeholder="Add notes or details..."
                />
            </div>

            {/* Task Type Selection */}
            <div className="flex gap-4">
                <label className="flex items-center">
                    <input
                        type="radio"
                        checked={isSchoolTask}
                        onChange={() => setIsSchoolTask(true)}
                        className="h-4.5 w-4.5 text-[#a37966] border-line-soft focus:ring-[#d4a090] bg-surface-soft cursor-pointer"
                    />
                    <span className="ml-2 sm:text-sm text-text-soft font-medium">School Task</span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input
                        type="radio"
                        checked={!isSchoolTask}
                        onChange={() => setIsSchoolTask(false)}
                        className="h-4.5 w-4.5 text-[#a37966] border-line-soft focus:ring-[#d4a090] bg-surface-soft cursor-pointer"
                    />
                    <span className="ml-2 sm:text-sm text-text-soft font-medium">Personal Task</span>
                </label>
            </div>

            {/* Course Selector - Only for School Tasks */}
            {isSchoolTask && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course</label>
                    {coursesLoaded ? (
                        courses.length > 0 ? (
                            <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer"
                            >
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} - {c.name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <p className="text-sm text-red-500 mt-1">No courses found. Please create a course first.</p>
                        )
                    ) : (
                        <p className="text-sm text-gray-400 mt-1">Loading courses...</p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6 sm:col-span-5">
                    <label className="block text-sm font-medium text-gray-700">{isSchoolTask ? 'Due Date' : 'Target Date'}</label>
                    <select
                        value={day}
                        onChange={(e) => setDay(parseInt(e.target.value))}
                        className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer"
                    >
                        {(() => {
                            // Calculate year for display purposes
                            const currentYear = new Date().getFullYear();
                            const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

                            return Array.from({ length: daysInMonth }, (_, i) => {
                                const d = i + 1;
                                // Determine if this date is in the past for this year
                                const tempDate = new Date(currentYear, month, d);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);

                                // Filter out past days if in current month
                                if (month === today.getMonth() && d < today.getDate()) {
                                    return null;
                                }

                                const targetY = tempDate < today ? currentYear + 1 : currentYear;
                                const dateObj = new Date(targetY, month, d);
                                const weekday = dateObj.toLocaleString('default', { weekday: 'long' });

                                return (
                                    <option key={d} value={d}>
                                        {weekday} {d}
                                    </option>
                                );
                            });
                        })()}
                    </select>
                </div>
                <div className="col-span-6 sm:col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Month</label>
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-span-12 sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <TimeSelect
                        value={time}
                        onChange={(val) => setTime(val)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Estimate (min)</label>
                <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none"
                    placeholder="60"
                />
            </div>

            {needsWorkBlocks && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer"
                    >
                        <option value="easy">Easy</option>
                        <option value="med">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
            )}

            <div className="flex items-center">
                <input
                    id="needsWorkBlocks"
                    type="checkbox"
                    checked={needsWorkBlocks}
                    onChange={(e) => setNeedsWorkBlocks(e.target.checked)}
                    className="h-4.5 w-4.5 text-[#a37966] focus:ring-[#d4a090] border-line-soft bg-surface-soft rounded cursor-pointer"
                />
                <label htmlFor="needsWorkBlocks" className="ml-2 block sm:text-sm text-text-soft font-medium cursor-pointer">
                    Auto-schedule work blocks
                </label>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#a37966] text-white px-6 py-2.5 rounded-full hover:bg-[#8f6a5a] shadow-[0_3px_12px_rgba(163,121,102,0.3)] transition-all font-semibold cursor-pointer"
                >
                    {loading ? 'Saving...' : 'Save Task'}
                </button>
            </div>
        </form >
    );
}
