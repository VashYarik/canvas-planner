'use client';

import { useState, useEffect } from 'react';
import DashboardCard from '@/app/components/DashboardCard';
import { addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

type Task = {
  id: string;
  title: string;
  dueAt: string | null;
  status: string;
  estimatedMinutes: number | null;
  difficulty: string | null;
  course?: { code: string; color: string | null };
};

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) {
        const now = new Date();
        const nextWeek = addDays(now, 7);
        const weeklyTasks = data.filter(t => {
          if (!t.dueAt || t.status === 'done') return false;
          const due = new Date(t.dueAt);
          return isWithinInterval(due, { start: startOfDay(now), end: endOfDay(nextWeek) });
        });
        setTasks(weeklyTasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plan/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate plan');
      await fetchTasks();
    } catch (error) {
      console.error("Failed to generate plan", error);
      alert("Failed to generate schedule. Check console for details.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 font-nunito text-text-soft">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-lora font-medium text-text-soft mb-2 tracking-tight">Dashboard</h1>
          <p className="text-muted-soft text-sm sm:text-base">Tasks due within the next 7 days.</p>
        </div>
        <button
          onClick={generateSchedule}
          disabled={loading}
          className={`font-nunito font-semibold py-2.5 px-6 rounded-full transition-all flex items-center gap-2.5 shadow-sm 
            ${loading 
              ? 'bg-bg-soft text-muted-soft cursor-not-allowed border border-line-soft' 
              : 'bg-[#a37966] text-white hover:bg-[#8f6a5a] cursor-pointer shadow-[0_3px_12px_rgba(163,121,102,0.3)]'
            }`}
        >
          <span className="text-lg leading-none">{loading ? '⏳' : '✨'}</span>
          {loading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </div>

      {loading ? (
        <div className="text-muted-soft text-center py-12 animate-pulse font-medium">Loading dashboard...</div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-card-soft rounded-2xl border-2 border-dashed border-line-soft shadow-sm">
          <p className="text-muted-soft text-lg font-medium">No tasks due this week! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
          {tasks.map(task => (
            <DashboardCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
