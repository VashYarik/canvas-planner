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

    const [resetMessage, setResetMessage] = useState('');

    const handleResetAccount = async () => {
        if (!confirm("🚨 WARNING: This will PERMANENTLY erase all your courses, tasks, and schedule, and reset your account to default settings. Are you absolutely sure?")) {
            return;
        }

        if (!confirm("Just being completely sure: Are you really sure you want to delete EVERYTHING?")) {
            return;
        }

        setLoading(true);
        setResetMessage('');
        try {
            const res = await fetch('/api/user/reset', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setResetMessage('Account successfully reset. Refreshing...');
                setHasToken(false);
                setTokenInput('');
                setCourses([]);

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setResetMessage(`Error: ${data.error}`);
            }
        } catch (err) {
            setResetMessage('Network error while resetting account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8 font-nunito text-text-soft">
            <h2 className="text-3xl sm:text-4xl font-lora font-medium tracking-tight mb-8">Settings</h2>

            <div className="bg-card-soft p-6 sm:p-8 rounded-2xl shadow-sm border border-line-soft mb-8 transition-shadow hover:shadow-md">
                <h3 className="text-xl font-lora font-medium mb-6 pb-3 border-b border-line-soft text-text-soft">Canvas Integration</h3>

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
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditingToken(true)}
                                    className="px-4 py-2 font-semibold text-sm bg-bg-soft hover:bg-[#e6d5cb] text-text-soft rounded-full transition-colors cursor-pointer border border-line-soft"
                                >
                                    Update Token
                                </button>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 font-semibold text-sm bg-[#fcf2f2] hover:bg-[#f6e1e1] text-red-600 rounded-full transition-colors cursor-pointer border border-red-100"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {(!hasToken || isEditingToken) && hasToken !== null && (
                        <div className="mt-6 p-5 sm:p-6 bg-surface-soft border border-line-soft rounded-2xl shadow-sm">
                            <h4 className="text-[15px] font-bold text-text-soft mb-2">Configure Canvas API Token</h4>
                            <p className="text-[13px] text-muted-soft mb-4 leading-relaxed">
                                Generate a "New Access Token" from your Canvas profile settings &rarr; Approved Integrations and paste it here.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="password"
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Paste your token here..."
                                    className="flex-1 px-4 py-2.5 border border-line-soft rounded-xl focus:ring-[#d4a090] focus:border-[#d4a090] bg-white text-sm outline-none transition-colors shadow-sm"
                                />
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={handleSaveToken}
                                        disabled={loading || !tokenInput.trim()}
                                        className="bg-[#a37966] text-white px-6 py-2.5 rounded-full hover:bg-[#8f6a5a] shadow-[0_3px_12px_rgba(163,121,102,0.3)] transition-all disabled:opacity-50 text-sm font-semibold cursor-pointer"
                                    >
                                        Save
                                    </button>
                                    {isEditingToken && (
                                        <button
                                            onClick={() => { setIsEditingToken(false); setTokenInput(''); }}
                                            className="bg-bg-soft text-text-soft px-6 py-2.5 rounded-full hover:bg-card-soft border border-line-soft transition-colors text-sm font-semibold cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-line-soft pt-8 mt-8">
                    <AvailabilitySettings />
                </div>

                <div className="border-t border-line-soft pt-6 mt-8">
                    <button
                        onClick={handleSync}
                        disabled={loading || hasToken === false}
                        className="w-full bg-surface-soft text-text-soft font-bold px-4 py-3.5 rounded-2xl border border-line-soft hover:bg-[#e6d5cb] transition-colors disabled:opacity-50 relative group cursor-pointer shadow-sm"
                    >
                        {loading ? 'Syncing...' : 'Manually Sync Now'}
                        {hasToken === false && (
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max px-3 py-1.5 bg-text-soft text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
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

            {/* Danger Zone */}
            <div className="bg-[#fcf2f2] p-6 sm:p-8 rounded-2xl shadow-sm border border-[#f6e1e1] mb-8">
                <h3 className="text-xl font-lora font-medium mb-3 text-red-600">Danger Zone</h3>
                <p className="text-[13px] sm:text-sm text-red-800/70 mb-6 font-medium leading-relaxed">
                    Resetting your account will permanently delete all your tasks, courses, schedule, and personalized settings. This action cannot be undone.
                </p>
                <div className="flex">
                    <button
                        onClick={handleResetAccount}
                        disabled={loading}
                        className="bg-red-50 text-red-600 px-6 py-2.5 rounded-full hover:bg-red-100 hover:text-red-700 transition flex items-center justify-center font-bold text-sm shadow-sm border border-red-200 cursor-pointer disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Reset Account to Default'}
                    </button>
                </div>
                {resetMessage && (
                    <p className={`mt-3 text-sm p-3 rounded bg-gray-50 ${resetMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {resetMessage}
                    </p>
                )}
            </div>
        </div>
    );
}
