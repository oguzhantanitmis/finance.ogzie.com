'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface FinanceContextType {
    hideAmounts: boolean
    setHideAmounts: (value: boolean) => void
    toggleHideAmounts: () => void
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
    const [hideAmounts, setHideAmountsState] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('hideAmounts')
        if (saved) {
            const isHidden = saved === 'true'
            setHideAmountsState(isHidden)
            if (isHidden) document.body.classList.add('privacy-active')
        }
    }, [])

    const setHideAmounts = (value: boolean) => {
        setHideAmountsState(value)
        localStorage.setItem('hideAmounts', String(value))
        if (value) {
            document.body.classList.add('privacy-active')
        } else {
            document.body.classList.remove('privacy-active')
        }
    }

    const toggleHideAmounts = () => {
        setHideAmounts(!hideAmounts)
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
