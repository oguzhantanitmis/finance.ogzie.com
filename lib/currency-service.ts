import { cache } from 'react'

import {
    TRY_DISPLAY,
    type DisplayCurrency,
    type DisplayCurrencyCode,
    DISPLAY_CURRENCY_CODES,
} from '@/lib/display-currency'
import { getMarketRates } from '@/lib/market-data'
import { getCurrentUser } from '@/lib/server-auth'

function isDisplayCode(value: string): value is DisplayCurrencyCode {
    return (DISPLAY_CURRENCY_CODES as string[]).includes(value)
}

/**
 * Oturumdaki kullanıcının görüntüleme para birimi + TRY kuru.
 * Kur CollectAPI'nin saklanan satış kurundan gelir; kur yoksa TRY'ye düşer.
 * İstek başına tek hesap (React cache).
 */
export const getUserDisplayCurrency = cache(async (): Promise<DisplayCurrency> => {
    const user = await getCurrentUser().catch(() => null)
    if (!user) return TRY_DISPLAY

    const code = user.preferredCurrency
    if (!code || code === 'TRY' || !isDisplayCode(code)) return TRY_DISPLAY

    const rates = await getMarketRates(user.id).catch(() => null)
    if (!rates) return TRY_DISPLAY

    const rate =
        code === 'USD' ? rates.USD
        : code === 'EUR' ? rates.EUR
        : code === 'GBP' ? rates.GBP
        : rates.GA // XAU = gram altın

    if (!rate || rate <= 0) return TRY_DISPLAY
    return { code, rate }
})
