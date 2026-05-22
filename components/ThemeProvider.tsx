'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'

type Theme       = 'dark' | 'light'
type ThemeChoice = 'dark' | 'light' | 'system'

interface ThemeContextValue {
    theme: Theme        // gerçek uygulanan tema (system → çözülmüş)
    choice: ThemeChoice // kullanıcı seçimi
    setChoice: (c: ThemeChoice) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: 'dark',
    choice: 'dark',
    setChoice: () => {},
    toggleTheme: () => {},
})

const STORAGE_KEY        = 'ogzie-theme'
const THEME_CHANGE_EVENT = 'ogzie-theme-change'

function readChoice(): ThemeChoice {
    if (typeof window === 'undefined') return 'dark'
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return 'dark'
}

function resolveTheme(choice: ThemeChoice): Theme {
    if (typeof window === 'undefined') return 'dark'
    if (choice === 'system') {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return choice
}

function subscribe(callback: () => void) {
    if (typeof window === 'undefined') return () => {}
    const mql = window.matchMedia('(prefers-color-scheme: light)')

    window.addEventListener('storage', callback)
    window.addEventListener(THEME_CHANGE_EVENT, callback)
    mql.addEventListener('change', callback)

    return () => {
        window.removeEventListener('storage', callback)
        window.removeEventListener(THEME_CHANGE_EVENT, callback)
        mql.removeEventListener('change', callback)
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const choice = useSyncExternalStore<ThemeChoice>(subscribe, readChoice, () => 'dark')
    const theme  = useSyncExternalStore<Theme>(subscribe, () => resolveTheme(readChoice()), () => 'dark')

    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        root.classList.add(theme)
    }, [theme])

    const setChoice = useCallback((c: ThemeChoice) => {
        localStorage.setItem(STORAGE_KEY, c)
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    }, [])

    const toggleTheme = useCallback(() => {
        const next: ThemeChoice = readChoice() === 'dark' ? 'light' : 'dark'
        setChoice(next)
    }, [setChoice])

    return (
        <ThemeContext.Provider value={{ theme, choice, setChoice, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
