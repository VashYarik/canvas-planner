'use client';

import { useState } from 'react';

export default function TaskForm({ onSuccess, initialCourseId }: { onSuccess: () => void, initialCourseId?: string }) {
    const now = new Date();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dateStr, setDateStr] = useState(() => {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
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
                    if (data.length > 0) {
                        if (initialCourseId && data.some(c => c.id === initialCourseId)) {
                            setSelectedCourseId(initialCourseId);
                        } else {
                            setSelectedCourseId(data[0].id);
                        }
                    }
                }
                setCoursesLoaded(true);
            })
            .catch(err => console.error("Failed to load courses", err));
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const [year, m, d] = dateStr.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const dueAt = new Date(year, m - 1, d, hours, minutes);

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
                const y = resetDate.getFullYear();
                const m = String(resetDate.getMonth() + 1).padStart(2, '0');
                const d = String(resetDate.getDate()).padStart(2, '0');
                setDateStr(`${y}-${m}-${d}`);
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
                    onChange={(e) => {
                        setDescription(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    className="mt-1.5 block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border min-h-[100px] transition-colors outline-none resize-none overflow-hidden"
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

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{isSchoolTask ? 'Due Date' : 'Target Date'}</label>
                    <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        className="block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer text-text-soft uppercase tracking-wide font-medium"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="block w-full rounded-xl border-line-soft bg-surface-soft shadow-sm focus:border-[#d4a090] focus:ring-[#d4a090] sm:text-sm p-3 border transition-colors outline-none cursor-pointer text-text-soft font-medium"
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
