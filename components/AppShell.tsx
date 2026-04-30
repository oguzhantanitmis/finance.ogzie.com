'use client'

import { usePathname } from 'next/navigation'

import Navbar from '@/components/Navbar'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

const PUBLIC_PATHS = new Set(['/login'])

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const showShell = !PUBLIC_PATHS.has(pathname)

    if (!showShell) {
        return <>{children}</>
    }

    return (
        <div
            className="min-h-screen selection:bg-[var(--accent-primary)]/20"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
            <Navbar />
            {/* Main Content Area — offset for sidebar (desktop) and top/bottom bars (mobile) */}
            <main className="lg:ml-[var(--sidebar-width)] pt-[57px] pb-[72px] lg:pt-0 lg:pb-0 min-h-screen transition-all duration-300">
                <ErrorBoundary>{children}</ErrorBoundary>
            </main>
        </div>
    )
}
