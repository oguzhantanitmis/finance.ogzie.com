'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface SidebarContextValue {
    collapsed: boolean
    toggleCollapsed: () => void
    setCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
    collapsed: false,
    toggleCollapsed: () => {},
    setCollapsed: () => {},
})

/**
 * Masaüstü kenar çubuğunun daralt/genişlet durumunu Navbar (genişlik) ile
 * TopBar (üstteki toggle butonu) arasında paylaşır. `--sidebar-width` CSS
 * değişkenini de buradan senkronlar (varsayılan globals.css'te 280px).
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsedState] = useState(false)

    useEffect(() => {
        document.documentElement.style.setProperty(
            '--sidebar-width',
            collapsed ? '72px' : '280px'
        )
    }, [collapsed])

    const value = useMemo<SidebarContextValue>(() => ({
        collapsed,
        setCollapsed: setCollapsedState,
        toggleCollapsed: () => setCollapsedState((v) => !v),
    }), [collapsed])

    return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
    return useContext(SidebarContext)
}
