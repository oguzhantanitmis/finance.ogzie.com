import type { BillingCycle, BudgetAlertType } from '@prisma/client'

export function formatBillingCycleLabel(value: BillingCycle | string) {
    switch (value) {
        case 'YEARLY':
            return 'Yıllık'
        case 'MONTHLY':
            return 'Aylık'
        default:
            return value
    }
}

export function formatAlertTypeLabel(value: BudgetAlertType | string) {
    switch (value) {
        case 'UPCOMING_PAYMENT':
            return 'Yaklaşan ödeme'
        case 'BUDGET_PRESSURE':
            return 'Bütçe baskısı'
        case 'RENEWAL':
            return 'Yenileme'
        case 'PRICE_CHANGE':
            return 'Fiyat değişimi'
        default:
            return value
    }
}

export function formatRecordStatusLabel(value: string) {
    switch (value) {
        case 'ACTIVE':
            return 'Aktif'
        case 'PAUSED':
            return 'Duraklatıldı'
        case 'CANCELED':
            return 'İptal edildi'
        case 'CLOSED':
            return 'Kapandı'
        default:
            return value.replaceAll('_', ' ')
    }
}

export function formatObligationSourceLabel(value: string) {
    switch (value) {
        case 'subscription':
            return 'Abonelik'
        case 'recurring':
            return 'Sabit gider'
        case 'debt':
            return 'Borç'
        default:
            return value
    }
}

export function formatCategoryLabel(value: string) {
    switch (value) {
        case 'CREDIT_CARD':
            return 'Kredi kartı'
        case 'LOAN':
            return 'Kredi'
        case 'KMH':
            return 'KMH'
        case 'PERSONAL':
            return 'Kişisel borç'
        case 'MANUAL':
            return 'Manuel borç'
        default:
            return value.replaceAll('_', ' ')
    }
}
