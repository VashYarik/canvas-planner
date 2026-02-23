'use client';

import { useState, useEffect } from 'react';
import AvailabilitySettings from '@/app/components/AvailabilitySettings';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [courses, setCourses] = useState<any[]>([]);

    const [hasToken, setHasToken] = useState<boolean | null>(null);
    const [tokenInput, setTokenInput] = useState('');
    const [isEditingToken, setIsEditingToken] = useState(false);

    useEffect(() => {
        fetch('/api/user/canvas-token')
            .then(res => res.json())
            .then(data => {
                if (data && data.hasToken !== undefined) {
                    setHasToken(data.hasToken);
                } else {
                    setHasToken(false);
                    if (data?.error) console.error(data.error);
                }
            })
            .catch(err => {
                console.error(err);
                setHasToken(false);
            });
    }, []);

    const handleSaveToken = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/user/canvas-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenInput })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setHasToken(data.hasToken);
                setIsEditingToken(false);
                setTokenInput('');
                setMessage(data.hasToken ? 'Canvas token saved successfully!' : 'Canvas token removed.');
            } else {
                setMessage(`Error: ${data.error || 'Failed to save token'}`);
            }
        } catch (err) {
            setMessage('Network error while saving token');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        if (confirm("Disconnect Canvas and remove your token?")) {
            setTokenInput('');
            handleSaveToken();
        }
    };

    const handleSync = async () => {
        setLoading(true);
        setMessage('');
        setCourses([]);

        try {
            const res = await fetch('/api/canvas/sync', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setMessage(`Success! Synced ${data.coursesSynced} new courses and ${data.assignmentsSynced} assignments.`);
                // setCourses(data.courses); // API changed output structure, simplify for now
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            setMessage('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-700">Canvas Integration</h3>

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="font-medium">Connection Status</p>
                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                {hasToken === null ? 'Checking...' : hasToken ? (
                                    <><span className="w-2 h-2 rounded-full bg-green-500"></span> Connected</>
                                ) : (
                                    <><span className="w-2 h-2 rounded-full bg-red-500"></span> Not Connected</>
                                )}
                            </p>
                        </div>
                        {hasToken && !isEditingToken ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditingToken(true)}
                                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                                >
                                    Update Token
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-3 py-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {(!hasToken || isEditingToken) && hasToken !== null && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-800 mb-2">Configure Canvas API Token</h4>
                            <p className="text-xs text-blue-600 mb-3">
                                Generate a "New Access Token" from your Canvas profile settings &rarr; Approved Integrations and paste it here.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Paste your token here..."
                                    className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                                <button
                                    onClick={handleSaveToken}
                                    disabled={loading || !tokenInput.trim()}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                                >
                                    Save
                                </button>
                                {isEditingToken && (
                                    <button
                                        onClick={() => { setIsEditingToken(false); setTokenInput(''); }}
                                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-6 mt-6">
                    <AvailabilitySettings />
                </div>

                <div className="border-t border-gray-100 pt-4 mt-6">
                    <button
                        onClick={handleSync}
                        disabled={loading || hasToken === false}
                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 relative group"
                    >
                        {loading ? 'Syncing...' : 'Manually Sync Now'}
                        {hasToken === false && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                Please configure your Canvas token first
                            </span>
                        )}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message}
                    </div>
                )}

                {courses.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-medium mb-2">Synced Courses:</h4>
                        <ul className="list-disc pl-5 text-sm text-gray-600">
                            {courses.map((c: any) => (
                                <li key={c.id}>
                                    {c.code} - {c.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
