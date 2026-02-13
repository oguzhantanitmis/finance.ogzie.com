// ============================================================
// 🏦 OGZIE FINANCE OS — Ekstre Motoru
// Aylık Ekstre Oluşturma & Durum Yönetimi
// ============================================================

import { calculateMinimumPayment } from './payment-engine'

/**
 * Tarih yardımcı fonksiyonu.
 * Ay sonlarını ve Şubat'ı doğru yönetir.
 */
export function getAdjustedDate(day: number, month: number, year: number): Date {
    const maxDay = new Date(year, month, 0).getDate()
    return new Date(year, month - 1, Math.min(day, maxDay))
}

/**
 * Bir sonraki ekstre tarihini hesapla.
 */
export function getNextStatementDate(cutOffDay: number, fromDate: Date = new Date()): Date {
    const year = fromDate.getFullYear()
    const month = fromDate.getMonth() + 1 // 1-indexed

    // Bu ayın kesim günü geçti mi?
    const thisMonthCutoff = getAdjustedDate(cutOffDay, month, year)

    if (fromDate < thisMonthCutoff) {
        return thisMonthCutoff
    }

    // Gelecek ay
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    return getAdjustedDate(cutOffDay, nextMonth, nextYear)
}

/**
 * Son ödeme tarihini hesapla.
 */
export function getDueDate(paymentDueDay: number, statementDate: Date): Date {
    const year = statementDate.getFullYear()
    const month = statementDate.getMonth() + 1

    // Son ödeme genelde ekstre tarihinden sonraki ayda
    const dueMonth = month === 12 ? 1 : month + 1
    const dueYear = month === 12 ? year + 1 : year

    return getAdjustedDate(paymentDueDay, dueMonth, dueYear)
}

/**
 * Son ödemeye kalan gün sayısı
 */
export function getDaysUntilDue(dueDate: Date): number {
    const now = new Date()
    const diff = dueDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Ekstre oluşturma verisi.
 * Veritabanına kaydedilecek CardStatement nesnesi için gerekli alanları hesaplar.
 */
export function buildStatementData(params: {
    creditCardId: string
    cutOffDay: number
    paymentDueDay: number
    totalLimit: number
    minPaymentRate: number
    previousBalance: number
    periodTransactionsTotal: number
    interestCharged: number
    taxCharged: number
    paymentsInPeriod: number
    statementDate?: Date
}): {
    creditCardId: string
    statementDate: Date
    dueDate: Date
    periodStart: Date
    periodEnd: Date
    previousBalance: number
    newCharges: number
    interestCharged: number
    taxCharged: number
    paymentsReceived: number
    statementBalance: number
    minimumPayment: number
    status: 'OPEN'
} {
    const {
        creditCardId,
        cutOffDay,
        paymentDueDay,
        totalLimit,
        minPaymentRate,
        previousBalance,
        periodTransactionsTotal,
        interestCharged,
        taxCharged,
        paymentsInPeriod,
        statementDate: customDate,
    } = params

    const statementDate = customDate || getNextStatementDate(cutOffDay)
    const dueDate = getDueDate(paymentDueDay, statementDate)

    // Dönem başlangıcı: önceki ayın kesim günü + 1
    const prevMonth = statementDate.getMonth() === 0 ? 12 : statementDate.getMonth()
    const prevYear = statementDate.getMonth() === 0
        ? statementDate.getFullYear() - 1
        : statementDate.getFullYear()
    const periodStart = getAdjustedDate(cutOffDay + 1, prevMonth, prevYear)
    const periodEnd = statementDate

    // Dönem borcu hesaplama
    const statementBalance = Math.max(
        previousBalance + periodTransactionsTotal + interestCharged + taxCharged - paymentsInPeriod,
        0
    )

    // Asgari ödeme
    const minimumPayment = statementBalance > 0
        ? calculateMinimumPayment(totalLimit, statementBalance, minPaymentRate)
        : 0

    return {
        creditCardId,
        statementDate,
        dueDate,
        periodStart,
        periodEnd,
        previousBalance: round(previousBalance),
        newCharges: round(periodTransactionsTotal),
        interestCharged: round(interestCharged),
        taxCharged: round(taxCharged),
        paymentsReceived: round(paymentsInPeriod),
        statementBalance: round(statementBalance),
        minimumPayment: round(minimumPayment),
        status: 'OPEN' as const,
    }
}

/**
 * Ekstre durumu güncelleme mantığı.
 * Son ödeme tarihi geçtiğinde çağrılır.
 */
export function determineStatementStatus(params: {
    statementBalance: number
    paymentsReceived: number
    minimumPayment: number
    dueDate: Date
}): 'OPEN' | 'PAID' | 'CLOSED' | 'OVERDUE' {
    const { statementBalance, paymentsReceived, minimumPayment, dueDate } = params
    const now = new Date()

    // Tam ödeme yapıldı
    if (paymentsReceived >= statementBalance) {
        return 'PAID'
    }

    // Son ödeme geçmedi
    if (now <= dueDate) {
        return 'OPEN'
    }

    // Son ödeme geçti
    if (paymentsReceived >= minimumPayment) {
        return 'CLOSED' // Asgari ödendi, dönem kapandı
    }

    return 'OVERDUE' // Asgari bile ödenmedi
}

function round(n: number): number {
    return Math.round(n * 100) / 100
}
