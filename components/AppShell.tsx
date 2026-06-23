'use client'

import { usePathname } from 'next/navigation'

import Navbar from '@/components/Navbar'
import TopBar from '@/components/TopBar'
import MobileTabBar from '@/components/MobileTabBar'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import { SidebarProvider } from '@/components/SidebarContext'

const PUBLIC_PATHS = new Set(['/login'])

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const showShell = !PUBLIC_PATHS.has(pathname)

    if (!showShell) {
        return <>{children}</>
    }

    return (
        <SidebarProvider>
            <div
                className="min-h-screen selection:bg-[var(--accent-primary)]/20"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
                <Navbar />
                {/* Main Content Area — offset for sidebar (desktop) and top/bottom bars (mobile) */}
                <main className="lg:ml-[var(--sidebar-width)] pt-[57px] pb-[calc(72px+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0 min-h-screen transition-all duration-300">
                    <TopBar />
                    <ErrorBoundary>{children}</ErrorBoundary>
                </main>
                <MobileTabBar />
            </div>
        </SidebarProvider>
    )
}
