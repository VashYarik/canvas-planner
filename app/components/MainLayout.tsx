import Link from 'next/link';
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen overflow-hidden bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                <h1 className="text-2xl font-bold text-blue-600 mb-8">Planner</h1>
                <nav className="flex-1 space-y-2">
                    <NavLink href="/" label="Dashboard" />
                    <NavLink href="/tasks" label="Tasks" />
                    <NavLink href="/calendar" label="Calendar" />
                    <NavLink href="/courses" label="Courses" />
                    <NavLink href="/settings" label="Settings" />
                </nav>
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
            <main className="flex-1 p-8 overflow-y-auto bg-gray-50">
                {children}
            </main>
        </div>
    );
}

function NavLink({ href, label }: { href: string; label: string }) {
    return (
        <Link href={href} className="block px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
            {label}
        </Link>
    );
}
