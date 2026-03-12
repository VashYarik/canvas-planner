'use client';

import Link from 'next/link';
import { ReactNode, useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';

export default function Layout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    // Close sidebar on route change for mobile
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="h-screen overflow-hidden bg-surface-soft flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-6 py-4 bg-sidebar-soft border-b border-line-soft flex-shrink-0 z-30 relative">
                <h1 className="font-lora text-xl font-bold text-text-soft">Planner</h1>
                <div className="flex items-center gap-4">
                    <UserButton />
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-text-soft hover:bg-bg-soft rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-soft"
                        aria-label="Toggle sidebar"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {sidebarOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </header>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`flex-shrink-0 bg-sidebar-soft border-r border-line-soft p-6 md:p-8 flex flex-col overflow-y-auto fixed md:relative inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:translate-x-0 md:w-56 ${sidebarOpen ? 'translate-x-0 w-56' : '-translate-x-full w-0 px-0'
                    }`}
            >
                <div className="hidden md:block">
                    <h1 className="font-lora text-[28px] font-medium text-text-soft mb-8 tracking-tight">Planner</h1>
                </div>

                <nav className="flex-1 space-y-2 mt-4 md:mt-0">
                    <NavLink href="/" label="Dashboard" pathname={pathname} />
                    <NavLink href="/tasks" label="Tasks" pathname={pathname} />
                    <NavLink href="/calendar" label="Calendar" pathname={pathname} />
                    <NavLink href="/courses" label="Courses" pathname={pathname} />
                    <NavLink href="/settings" label="Settings" pathname={pathname} />
                </nav>
                <div className="hidden md:block mt-8">
                    <UserButton />
                </div>
                <div className="pt-4 mt-auto">
                    <p className="text-xs text-muted-soft">MVP v0.1.0</p>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#ccaa99] text-white flex items-center justify-center font-bold text-sm">N</div>
                        <div className="text-[10px] text-muted-soft leading-tight flex flex-col">
                            <span className="font-bold text-text-soft text-xs">Yaroslav</span>
                            <a
                                href="https://github.com/VashYarik"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-accent-soft transition-colors"
                            >
                                github.com/VashYarik
                            </a>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-surface-soft w-full relative z-0">
                <div className="max-w-[1600px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    
    // Add corresponding icons based on label
    const getIcon = () => {
        switch (label) {
            case 'Dashboard': return <svg className="w-4 h-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
            case 'Tasks': return <svg className="w-4 h-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>;
            case 'Calendar': return <svg className="w-4 h-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
            case 'Courses': return <svg className="w-4 h-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
            case 'Settings': return <svg className="w-4 h-4 mr-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
            default: return null;
        }
    };

    return (
        <Link
            href={href}
            className={`flex items-center px-4 py-3 rounded-2xl transition-all duration-200 font-nunito text-sm ${isActive
                ? 'bg-card-soft text-text-soft font-semibold shadow-sm'
                : 'text-text-soft hover:bg-bg-soft text-opacity-80 hover:text-opacity-100'
                }`}
        >
            {getIcon()}
            {label}
        </Link>
    );
}
