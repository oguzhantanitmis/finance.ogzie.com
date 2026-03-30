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
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />
            <ErrorBoundary>{children}</ErrorBoundary>
        </div>
    )
}

