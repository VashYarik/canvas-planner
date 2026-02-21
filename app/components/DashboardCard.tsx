import { format } from 'date-fns';

type Task = {
    id: string;
    title: string;
    dueAt: string | null;
    status: string;
    estimatedMinutes: number | null;
    difficulty: string | null;
    course?: { code: string; color: string | null };
    workBlocks?: { startAt: string }[];
};

export default function DashboardCard({ task }: { task: Task }) {
    const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'done';
    const nextBlock = task.workBlocks?.[0];
    const plannedDate = nextBlock ? new Date(nextBlock.startAt) : null;

    // Difficulty colors
    const difficultyColors: Record<string, string> = {
        easy: 'bg-green-50 border-green-200 text-green-700',
        med: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        hard: 'bg-red-50 border-red-200 text-red-700'
    };

    const difficultyStyle = task.difficulty ? difficultyColors[task.difficulty] || 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-700';

    return (
        <div className={`p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between h-full ${isOverdue ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-100'}`}>
            <div>
                <div className="flex justify-between items-start mb-3">
                    {task.course && (
                        <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: task.course.color || '#6B7280' }}
                        >
                            {task.course.code}
                        </span>
                    )}
                    {task.difficulty && (
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize border ${difficultyStyle}`}>
                            {task.difficulty}
                        </span>
                    )}
                </div>

                <h3 className="font-semibold text-gray-800 text-lg leading-tight mb-2 line-clamp-2">
                    {task.title}
                </h3>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <span className="w-5 text-center">📅</span>
                    <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                        {task.dueAt ? format(new Date(task.dueAt), 'EEE, MMM d, h:mm a') : 'No due date'}
                    </span>
                </div>

                {plannedDate && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <span className="w-5 text-center">🗓️</span>
                        <span className="font-medium">
                            Plan: {format(plannedDate, 'EEE, MMM d, h:mm a')}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <span className="w-5 text-center">⏱️</span>
                    <span>
                        {task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'No estimate'}
                    </span>
                </div>
            </div>
        </div>
    );
}
