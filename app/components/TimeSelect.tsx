import React from 'react';

type Props = {
    value: string; // Expected "HH:mm" (24h)
    onChange: (val: string) => void;
    className?: string; // Optional wrapper styling
};

export default function TimeSelect({ value, onChange, className = '' }: Props) {
    const parseValue = () => {
        if (!value) return { h: 12, m: 0, ampm: 'AM' };
        const [hhStr, mmStr] = value.split(':');
        const hh = Number(hhStr);
        const mm = Number(mmStr);
        if (isNaN(hh) || isNaN(mm)) return { h: 12, m: 0, ampm: 'AM' };

        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h = hh % 12 || 12;
        return { h, m: mm, ampm };
    };

    const { h, m, ampm } = parseValue();

    const update = (newH: number, newM: number, newAMPM: string) => {
        let hh = newH === 12 ? (newAMPM === 'AM' ? 0 : 12) : newH + (newAMPM === 'PM' ? 12 : 0);
        onChange(`${hh.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
    };

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <select
                value={h}
                onChange={e => update(Number(e.target.value), m, ampm)}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <option key={num} value={num}>{num}</option>
                ))}
            </select>
            <span className="text-gray-500 font-medium">:</span>
            <select
                value={m}
                onChange={e => update(h, Number(e.target.value), ampm)}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-blue-500 focus:border-blue-500 text-gray-700"
            >
                {Array.from({ length: 60 }).map((_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
            </select>
            <select
                value={ampm}
                onChange={e => update(h, m, e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-blue-500 focus:border-blue-500 text-gray-700 ml-1"
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
}
