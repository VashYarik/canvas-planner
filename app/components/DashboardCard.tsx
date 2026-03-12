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

    // Difficulty colors using Soft UI aesthetic
    const difficultyColors: Record<string, string> = {
        easy: 'bg-[#e8f0e8] border-[#c0d6c0] text-[#3a5a38]', // Sage
        med:  'bg-[#f7eed8] border-[#e6cda3] text-[#6a5030]', // Sand
        hard: 'bg-[#f5e8e4] border-[#eabeb2] text-[#7a3820]'  // Peach
    };

    const difficultyStyle = task.difficulty ? difficultyColors[task.difficulty] || 'bg-bg-soft border-line-soft text-muted-soft' : 'bg-bg-soft border-line-soft text-muted-soft';

    return (
        <div className={`p-6 rounded-2xl border transition-all duration-200 bg-card-soft flex flex-col justify-between h-full group ${isOverdue ? 'border-red-300 ring-1 ring-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.1)]' : 'border-line-soft shadow-sm hover:shadow-md hover:-translate-y-1'}`}>
            <div>
                <div className="flex justify-between items-start mb-3">
                    {task.course && (
                        <span
                            className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-sm"
                            style={{ backgroundColor: task.course.color || '#a37966' }}
                        >
                            {task.course.code}
                        </span>
                    )}
                    {task.difficulty && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border ${difficultyStyle}`}>
                            {task.difficulty}
                        </span>
                    )}
                </div>

                <h3 className="font-lora font-medium text-text-soft text-xl leading-snug mb-2 line-clamp-3 group-hover:text-[#a37966] transition-colors">
                    {task.title}
                </h3>
            </div>

            <div className="mt-5 pt-4 border-t border-line-soft space-y-2.5 text-sm text-muted-soft font-nunito font-medium">
                <div className="flex items-center gap-2">
                    <span className="w-5 text-center opacity-70">📅</span>
                    <span className={isOverdue ? 'text-red-500 font-bold' : 'text-text-soft'}>
                        {task.dueAt ? format(new Date(task.dueAt), 'EEE, MMM d, h:mm a') : 'No due date'}
                    </span>
                </div>

                {plannedDate && (
                    <div className="flex items-center gap-2 text-[#785a70]">
                        <span className="w-5 text-center opacity-70">🗓️</span>
                        <span className="font-medium">
                            Plan: {format(plannedDate, 'EEE, MMM d, h:mm a')}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 text-text-soft">
                    <span className="w-5 text-center opacity-70">⏱️</span>
                    <span>
                        {task.estimatedMinutes ? `${task.estimatedMinutes} min` : 'No estimate'}
                    </span>
                </div>
            </div>
        </div>
    );
}
