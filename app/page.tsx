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
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-500">Tasks due within the next 7 days.</p>
        </div>
        <button
          onClick={generateSchedule}
          disabled={loading}
          className={`font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
        >
          <span>{loading ? '⏳' : '✨'}</span>
          {loading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </div>

      {loading ? (
        <div>Loading dashboard...</div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500">No tasks due this week! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tasks.map(task => (
            <DashboardCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
