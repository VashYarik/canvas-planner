
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
                <section className="bg-card-soft p-6 sm:p-8 rounded-2xl shadow-sm border border-line-soft">
                    <ManualCourseForm
                        initialData={editingCourse ? getGroupedFormData(editingCourse) : undefined}
                        onSuccess={handleSuccess}
                        onCancel={handleCancel}
                    />
                </section>
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            setIsCreating(true);
                            setEditingCourse(null);
                            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-[#a37966] text-white px-6 py-2.5 rounded-full hover:bg-[#8f6a5a] shadow-[0_3px_12px_rgba(163,121,102,0.3)] font-semibold transition-all cursor-pointer"
                    >
                        + Add New Course
                    </button>
                </div>
            )}

            {/* Course List */}
            <section className="space-y-6">
                <h2 className="text-2xl font-lora font-medium text-text-soft">Your Courses</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
                    {initialCourses.map(course => (
                        <div
                            key={course.id}
                            onClick={() => {
                                setEditingCourse(course);
                                setIsCreating(false);
                                document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-card-soft p-6 rounded-2xl shadow-sm border border-line-soft relative overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full opacity-80" style={{ backgroundColor: course.color || '#a37966' }}></div>
                            <div className="pl-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <h3 className="font-lora font-medium text-xl group-hover:text-[#a37966] transition-colors truncate">{course.name}</h3>
                                        <p className="text-sm font-semibold text-muted-soft tracking-wider uppercase mt-1">{course.code}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        {course.sourceId?.startsWith('manual') ? (
                                            <span className="text-[10px] font-bold tracking-wider uppercase bg-[#f5e8e4] text-[#a37966] px-2.5 py-1 rounded-full">Manual</span>
                                        ) : (
                                            <span className="text-[10px] font-bold tracking-wider uppercase bg-[#e8f0e8] text-[#3a5a38] px-2.5 py-1 rounded-full">Canvas</span>
                                        )}
                                        <span className="text-xs font-semibold text-muted-soft opacity-0 group-hover:opacity-100 transition-opacity">Click to Edit</span>
                                    </div>
                                </div>

                                {course.startDate && course.endDate && (
                                    <div className="mt-4 text-xs font-semibold text-text-soft flex items-center gap-2">
                                        <span className="opacity-70">📅</span> {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
                                    </div>
                                )}

                                <div className="mt-4 space-y-2">
                                    {/* Display condensed schedule */}
                                    {getGroupedFormData(course).schedule.slice(0, 3).map((p, i) => (
                                        <div key={i} className="text-[13px] flex items-center gap-3 text-muted-soft">
                                            <span className="font-bold text-text-soft w-10 shrink-0">
                                                {p.days.map(d => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d]).join('')}
                                            </span>
                                            <span className="font-medium bg-bg-soft px-2 py-0.5 rounded-md border border-line-soft">
                                                {formatTimeAMPM(p.startTime)} - {formatTimeAMPM(p.endTime)}
                                            </span>
                                            {p.location && <span className="italic truncate">{p.location}</span>}
                                        </div>
                                    ))}
                                    {course.classPeriods.length === 0 && <p className="text-sm font-medium text-muted-soft italic">No scheduled classes</p>}
                                    {getGroupedFormData(course).schedule.length > 3 && <p className="text-sm font-bold text-muted-soft">...</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {initialCourses.length === 0 && (
                        <div className="col-span-1 md:col-span-2 p-12 text-center bg-card-soft rounded-2xl border-2 border-dashed border-line-soft shadow-sm">
                            <p className="text-muted-soft text-lg font-medium">No courses found. Add one above!</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
