import React, { useEffect, useRef } from 'react';

type Props = {
    value: string; // Expected "HH:mm" (24h)
    onChange: (val: string) => void;
    className?: string; // Optional wrapper styling
};

export default function TimeGridSelect({ value, onChange, className = '' }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate time slots (every 30 mins)
    const timeSlots = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = h.toString().padStart(2, '0');
            const minute = m.toString().padStart(2, '0');
            const time24 = `${hour}:${minute}`;

            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayH = h % 12 || 12;
            const displayTime = `${displayH}:${minute} ${ampm}`;

            timeSlots.push({ time24, displayTime, h, m });
        }
    }

    // Scroll to the selected time initially
    useEffect(() => {
        if (scrollRef.current && value) {
            const [h, m] = value.split(':');
            const index = Number(h) * 2 + (Number(m) >= 30 ? 1 : 0);
            const slotElement = scrollRef.current.children[index] as HTMLElement;
            if (slotElement) {
                // Center the selected element in the scroll view
                scrollRef.current.scrollTop = slotElement.offsetTop - scrollRef.current.clientHeight / 2 + slotElement.clientHeight / 2;
            }
        }
    }, []); // Only run once on mount

    return (
        <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm ${className}`}>
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Time</span>
            </div>
            <div
                ref={scrollRef}
                className="max-h-64 overflow-y-auto w-full flex flex-col p-1 scrollable-time-grid format-scroll"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#CBD5E1 transparent'
                }}
            >
                <div className="grid grid-cols-1 gap-1">
                    {timeSlots.map((slot) => {
                        const isSelected = value === slot.time24;
                        // For styling: full hour vs half hour
                        const isFullHour = slot.m === 0;

                        return (
                            <button
                                key={slot.time24}
                                type="button"
                                onClick={() => onChange(slot.time24)}
                                className={`
                                    w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-between
                                    ${isSelected
                                        ? 'bg-ocean text-white font-medium shadow-md'
                                        : 'hover:bg-blue-50 text-gray-700 hover:text-blue-700'}
                                    ${!isSelected && !isFullHour ? 'text-gray-500 pl-8' : ''}
                                `}
                            >
                                <span>{slot.displayTime}</span>
                                {isSelected && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
