'use client';

import { useState, useEffect } from 'react';
import TaskList from '@/app/components/TaskList';
import TaskForm from '@/app/components/TaskForm';

export default function TasksPage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/tasks');
            const data = await res.json();
            setTasks(data);
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Tasks</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleClearAll}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                        Clear All
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        {showForm ? 'Cancel' : '+ New Task'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                    <TaskForm onSuccess={handleTaskCreated} />
                </div>
            )}

            {loading ? (
                <p>Loading tasks...</p>
            ) : (
                <TaskList tasks={tasks} onUpdate={fetchTasks} />
            )}
        </div>
    );
}
