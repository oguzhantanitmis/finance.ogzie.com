'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

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

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
        if (stored === 'light' || stored === 'dark') {
            setThemeState(stored)
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            setThemeState('light')
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        const root = document.documentElement
        root.classList.remove('dark', 'light')
        root.classList.add(theme)
        localStorage.setItem(STORAGE_KEY, theme)
    }, [theme, mounted])

    const setTheme = useCallback((t: Theme) => setThemeState(t), [])
    const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')), [])

    // Prevent flash of wrong theme
    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
