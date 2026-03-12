'use client';

import { useState, useEffect } from 'react';
import TaskList from '@/app/components/TaskList';
import TaskForm from '@/app/components/TaskForm';

export default function TasksPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            if (!res.ok) throw new Error('Failed to fetch tasks');
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleTaskCreated = () => {
        setShowForm(false);
        fetchTasks();
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete ALL tasks? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch('/api/tasks', { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete tasks');
            fetchTasks();
        } catch (error) {
            console.error('Failed to delete tasks', error);
            alert('Failed to delete tasks');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 font-nunito text-text-soft">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-3xl sm:text-4xl font-lora font-medium text-text-soft tracking-tight">Tasks</h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleClearAll}
                        className="bg-red-50 text-red-600 px-5 py-2.5 rounded-full hover:bg-red-100 transition-colors font-semibold text-sm shadow-sm border border-red-200"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-6 py-2.5 rounded-full transition-all flex items-center gap-2 font-semibold text-sm shadow-sm cursor-pointer
                            ${showForm 
                                ? 'bg-bg-soft text-muted-soft border border-line-soft hover:bg-card-soft' 
                                : 'bg-[#a37966] text-white hover:bg-[#8f6a5a] shadow-[0_3px_12px_rgba(163,121,102,0.3)]'
                            }`}
                    >
                        {showForm ? 'Cancel' : '+ New Task'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="mb-10 p-6 sm:p-8 bg-card-soft rounded-2xl shadow-sm border border-line-soft transition-all">
                    <TaskForm onSuccess={handleTaskCreated} />
                </div>
            )}

            {loading ? (
                <p className="text-muted-soft text-center py-12 animate-pulse font-medium">Loading tasks...</p>
            ) : (
                <TaskList tasks={tasks} onUpdate={fetchTasks} />
            )}
        </div>
    );
}
