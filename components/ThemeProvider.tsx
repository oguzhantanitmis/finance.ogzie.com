'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
    theme: Theme
    toggleTheme: () => void
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    toggleTheme: () => {},
    setTheme: () => {},
})

const STORAGE_KEY = 'ogzie-theme'
const THEME_CHANGE_EVENT = 'ogzie-theme-change'

function readTheme(): Theme {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function subscribeTheme(callback: () => void) {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('storage', callback)
    window.addEventListener(THEME_CHANGE_EVENT, callback)

    return () => {
        window.removeEventListener('storage', callback)
        window.removeEventListener(THEME_CHANGE_EVENT, callback)
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => 'dark')

    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        root.classList.add(theme)
    }, [theme])

    const setTheme = useCallback((t: Theme) => {
        localStorage.setItem(STORAGE_KEY, t)
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    }, [])
    const toggleTheme = useCallback(() => {
        const nextTheme = readTheme() === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
    }, [setTheme])

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
