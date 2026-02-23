
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ManualCourseForm from '@/app/components/ManualCourseForm';
import { formatTimeAMPM } from '@/lib/timeUtils';

interface ClassPeriod {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string | null;
}

interface Course {
    id: string;
    name: string;
    code: string;
    color: string | null;
    startDate: Date | null;
    endDate: Date | null;
    sourceId: string | null;
    classPeriods: ClassPeriod[];
}

interface Props {
    initialCourses: Course[];
}

export default function CourseManager({ initialCourses }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId) {
            const course = initialCourses.find(c => c.id === editId);
            if (course) {
                setEditingCourse(course);
                setIsCreating(false);
            }
        }
    }, [searchParams, initialCourses]);

    const handleSuccess = () => {
        setEditingCourse(null);
        setIsCreating(false);
        router.push('/courses'); // Clear search params
        router.refresh();
    };

    const handleCancel = () => {
        setEditingCourse(null);
        setIsCreating(false);
    };

    // Transform Course to the format expected by ManualCourseForm
    const getFormData = (course: Course) => ({
        id: course.id,
        name: course.name,
        code: course.code,
        color: course.color || '#3B82F6',
        startDate: course.startDate ? new Date(course.startDate).toISOString().split('T')[0] : '',
        endDate: course.endDate ? new Date(course.endDate).toISOString().split('T')[0] : '',
        schedule: course.classPeriods.map(p => ({
            id: p.id,
            days: [p.dayOfWeek], // API returns individual periods, form expects grouped. We'll group them if possible or leave separate.
            // Grouping logic (optional optimization): check if time/loc matches to merge days.
            // For now, simple mapping is fine, though it might split "MWF" into 3 rows.
            // Let's implement simple grouping to restore the user experience.
            startTime: p.startTime,
            endTime: p.endTime,
            location: p.location || ''
        }))
    });

    // Helper to group periods back into multi-day rows for valid form display
    const getGroupedFormData = (course: Course) => {
        const rawData = getFormData(course);
        const groupedSchedule: { days: number[]; startTime: string; endTime: string; location: string }[] = [];

        rawData.schedule.forEach(period => {
            const existing = groupedSchedule.find(g =>
                g.startTime === period.startTime &&
                g.endTime === period.endTime &&
                g.location === period.location
            );
            if (existing) {
                if (!existing.days.includes(period.days[0])) {
                    existing.days.push(period.days[0]);
                    existing.days.sort();
                }
            } else {
                groupedSchedule.push({
                    days: period.days,
                    startTime: period.startTime,
                    endTime: period.endTime,
                    location: period.location
                });
            }
        });

        return { ...rawData, schedule: groupedSchedule };
    };

    return (
        <div className="space-y-8">
            {/* Action Area */}
            {(isCreating || editingCourse) ? (
                <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <ManualCourseForm
                        initialData={editingCourse ? getGroupedFormData(editingCourse) : undefined}
                        onSuccess={handleSuccess}
                        onCancel={handleCancel}
                    />
                </section>
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 shadow-sm"
                    >
                        + Add New Course
                    </button>
                </div>
            )}

            {/* Course List */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Your Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {initialCourses.map(course => (
                        <div
                            key={course.id}
                            onClick={() => {
                                setEditingCourse(course);
                                setIsCreating(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: course.color || '#ccc' }}></div>
                            <div className="pl-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors">{course.name}</h3>
                                        <p className="text-sm text-gray-500">{course.code}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {course.sourceId?.startsWith('manual') ? (
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Manual</span>
                                        ) : (
                                            <span className="text-xs bg-blue-50 px-2 py-1 rounded text-blue-600">Canvas</span>
                                        )}
                                        <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to Edit</span>
                                    </div>
                                </div>

                                {course.startDate && course.endDate && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        📅 {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                                    </div>
                                )}

                                <div className="mt-4 space-y-1">
                                    {/* Display condensed schedule */}
                                    {getGroupedFormData(course).schedule.slice(0, 3).map((p, i) => (
                                        <div key={i} className="text-xs flex gap-2 text-gray-700">
                                            <span className="font-medium w-8">
                                                {p.days.map(d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]).join('')}
                                            </span>
                                            <span>{formatTimeAMPM(p.startTime)} - {formatTimeAMPM(p.endTime)}</span>
                                            {p.location && <span className="text-gray-500">({p.location})</span>}
                                        </div>
                                    ))}
                                    {course.classPeriods.length === 0 && <p className="text-xs text-gray-400">No scheduled classes</p>}
                                    {getGroupedFormData(course).schedule.length > 3 && <p className="text-xs text-gray-400">...</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {initialCourses.length === 0 && (
                        <p className="text-gray-500 italic col-span-2 text-center py-8">No courses found. Add one above!</p>
                    )}
                </div>
            </section>
        </div>
    );
}
