'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface FinanceContextType {
    hideAmounts: boolean
    setHideAmounts: (value: boolean) => void
    toggleHideAmounts: () => void
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

function applyPrivacyMode(value: boolean) {
    document.body.classList.toggle('privacy-active', value)
    document.documentElement.classList.toggle('privacy-active', value)
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
    const [hideAmounts, setHideAmountsState] = useState(() => {
        if (typeof window === 'undefined') {
            return false
        }

        return window.localStorage.getItem('hideAmounts') === 'true'
    })

    useEffect(() => {
        window.localStorage.setItem('hideAmounts', String(hideAmounts))
        applyPrivacyMode(hideAmounts)
    }, [hideAmounts])

    const setHideAmounts = (value: boolean) => {
        setHideAmountsState(value)
    }

    const toggleHideAmounts = () => {
        setHideAmountsState((current) => !current)
    }

    return (
        <FinanceContext.Provider value={{ hideAmounts, setHideAmounts, toggleHideAmounts }}>
            {children}
        </FinanceContext.Provider>
    )
}

export function useFinance() {
    const context = useContext(FinanceContext)
    if (context === undefined) {
        throw new Error('useFinance must be used within a FinanceProvider')
    }
    return context
}
