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
        <div className="h-screen overflow-hidden bg-gray-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 flex-shrink-0 z-30 relative">
                <h1 className="text-xl font-bold text-blue-600">Planner</h1>
                <div className="flex items-center gap-4">
                    <UserButton />
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`w-64 flex-shrink-0 bg-white border-r border-gray-200 p-6 flex flex-col overflow-y-auto fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="hidden md:block">
                    <h1 className="text-2xl font-bold text-blue-600 mb-8">Planner</h1>
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
                <div className="pt-4 border-t border-gray-100 mt-auto">
                    <p className="text-xs text-gray-400">MVP v0.1.0</p>
                    <div className="mt-4 text-[10px] text-gray-400">
                        <p>made by Yaroslav Vashchuk</p>
                        <p className="my-0.5">||</p>
                        <a
                            href="https://github.com/VashYarik"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 hover:underline"
                        >
                            https://github.com/VashYarik
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-50 w-full relative z-0">
                {children}
            </main>
        </div>
    );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
        <Link
            href={href}
            className={`block px-4 py-2 rounded-lg transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            {label}
        </Link>
    );
}
