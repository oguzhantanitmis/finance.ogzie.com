import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { formatTryAmount } from '@/lib/display-currency'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'TL') {
    // TRY tutarlar kullanıcının ana para birimine çevrilerek gösterilir;
    // açıkça başka birimdeki kayıtlar (ör. USD abonelik) olduğu gibi kalır.
    if (currency === 'TL' || currency === 'TRY') {
        return formatTryAmount(amount)
    }
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
    }).format(amount)
}

export function formatNumber(amount: number) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}
