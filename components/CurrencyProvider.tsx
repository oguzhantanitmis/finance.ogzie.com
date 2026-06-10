'use client'

import { createContext, useContext, type ReactNode } from 'react'

import {
    setActiveDisplayCurrency,
    TRY_DISPLAY,
    type DisplayCurrency,
} from '@/lib/display-currency'

const CurrencyContext = createContext<DisplayCurrency>(TRY_DISPLAY)

/**
 * Görüntüleme para birimini formatlayıcı singleton'ına bağlar.
 * Render gövdesinde set edilir: alt ağaçtaki tüm istemci bileşenleri
 * (SSR dahil) formatCurrency/tl çağrılarında doğru birimi kullanır.
 */
export default function CurrencyProvider({
    code,
    rate,
    children,
}: {
    code: DisplayCurrency['code']
    rate: number
    children: ReactNode
}) {
    const display: DisplayCurrency = { code, rate }
    setActiveDisplayCurrency(display)

    return <CurrencyContext.Provider value={display}>{children}</CurrencyContext.Provider>
}

export function useDisplayCurrency() {
    return useContext(CurrencyContext)
}
