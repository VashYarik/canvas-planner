'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';

type ClassPeriod = {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    course: { id: string; name: string; code: string; color: string | null };
};

export default function ClassPeriodModal({
    period,
    date,
    isCanceled,
    onClose
}: {
    period: ClassPeriod;
    date: Date;
    isCanceled: boolean;
    onClose: () => void;
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleCancel = async () => {
        setIsLoading(true);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            if (isCanceled) {
                await fetch('/api/class-exceptions', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ classPeriodId: period.id, date: dateStr })
                });
            } else {
                await fetch('/api/class-exceptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        courseId: period.course.id,
                        classPeriodId: period.id,
                        date: dateStr,
                        exceptionType: 'canceled'
                    })
                });
            }
            router.refresh();
            onClose();
        } catch (error) {
            console.error('Failed to toggle class exception', error);
            setIsLoading(false);
        }
    };

    const handleAddHomework = () => {
        router.push(`/tasks?courseId=${period.course.id}`);
        onClose();
    };

    const handleEditCourse = () => {
        router.push(`/courses?edit=${period.course.id}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <div className="absolute inset-0 bg-[#2b2523]/40 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-surface-soft border border-line-soft rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 pt-5 pb-4 border-b border-line-soft relative">
                    <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-bg-soft text-muted-soft hover:bg-card-soft transition-colors cursor-pointer text-lg">&times;</button>
                    
                    <div className="flex items-center gap-2.5 mb-2">
                        {period.course.color && <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: period.course.color }} />}
                        <div className="font-semibold text-text-soft text-sm tracking-wide bg-bg-soft px-2.5 py-0.5 rounded-full">{period.course.code || 'Course'}</div>
                    </div>
                    <h2 className="text-xl font-bold text-text-soft leading-tight tracking-tight pr-8">{period.course.name}</h2>
                    <div className="text-muted-soft text-sm mt-1.5 font-medium">
                        {format(date, 'EEEE, MMMM d')} &bull; {period.startTime} - {period.endTime}
                    </div>
                </div>

                <div className="p-3">
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={handleToggleCancel}
                            disabled={isLoading}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-between group ${isCanceled ? 'bg-[#a37966] text-white hover:bg-[#8f6a5a]' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        >
                            <span>{isCanceled ? 'Undo Cancellation' : 'Cancel Class for This Date'}</span>
                            <span className="opacity-60 group-hover:opacity-100 transition-opacity">{isCanceled ? '↺' : '✕'}</span>
                        </button>

                        <button
                            onClick={handleAddHomework}
                            className="w-full text-left px-4 py-3 rounded-xl bg-bg-soft hover:bg-card-soft text-text-soft text-sm font-semibold transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <span>Add Task / Homework</span>
                            <span className="opacity-60 group-hover:opacity-100 transition-opacity">＋</span>
                        </button>

                        <button
                            onClick={handleEditCourse}
                            className="w-full text-left px-4 py-3 rounded-xl bg-bg-soft hover:bg-card-soft text-text-soft text-sm font-semibold transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <span>Edit Course Settings</span>
                            <span className="opacity-60 group-hover:opacity-100 transition-opacity">✎</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
