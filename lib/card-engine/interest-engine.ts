// ============================================================
// 🏦 OGZIE FINANCE OS — Faiz Hesaplama Motoru
// Türk Bankacılık Sistemi Faiz Mantığı
// ============================================================

import { InterestResult, InterestCalculationInput } from './types'

/**
 * Temel faiz hesaplama fonksiyonu.
 * Türk bankacılık formülü: (Anapara × AylıkOran × GünSayısı) / 3000
 * 
 * Not: 3000 = 100 (yüzde çevirme) × 30 (standart ay günü)
 */
export function calculateInterest(input: InterestCalculationInput): InterestResult {
    const { principal, monthlyRate, days, kkdfRate, bsmvRate } = input

    if (principal <= 0 || monthlyRate <= 0 || days <= 0) {
        return { interest: 0, kkdf: 0, bsmv: 0, totalCost: 0 }
    }

    const interest = (principal * monthlyRate * days) / 3000
    const kkdf = interest * kkdfRate
    const bsmv = interest * bsmvRate

    return {
        interest: round(interest),
        kkdf: round(kkdf),
        bsmv: round(bsmv),
        totalCost: round(interest + kkdf + bsmv),
    }
}

/**
 * Akdi Faiz (Contractual Interest)
 * Dönem borcunun tamamı ödenmeyip, asgari ödeme yapıldığında
 * kalan bakiyeye uygulanan faiz.
 */
export function calculateContractualInterest(
    remainingBalance: number,
    contractualRate: number,
    days: number,
    kkdfRate: number = 0.15,
    bsmvRate: number = 0.15
): InterestResult {
    return calculateInterest({
        principal: remainingBalance,
        monthlyRate: contractualRate,
        days,
        kkdfRate,
        bsmvRate,
    })
}

/**
 * Gecikme Faizi (Default Interest)
 * Asgari ödemenin altında ödeme yapıldığında, ödenmemiş 
 * asgari tutara uygulanan ek faiz.
 */
export function calculateDefaultInterest(
    unpaidMinimum: number,
    defaultRate: number,
    days: number,
    kkdfRate: number = 0.15,
    bsmvRate: number = 0.15
): InterestResult {
    return calculateInterest({
        principal: unpaidMinimum,
        monthlyRate: defaultRate,
        days,
        kkdfRate,
        bsmvRate,
    })
}

/**
 * Nakit Avans Faizi (Cash Advance Interest)
 * Nakit avans çekim tarihinden itibaren işleyen faiz.
 * Ekstre dönemini bekleMEZ.
 */
export function calculateCashAdvanceInterest(
    cashAdvanceAmount: number,
    cashAdvanceRate: number,
    days: number,
    kkdfRate: number = 0.15,
    bsmvRate: number = 0.15
): InterestResult {
    return calculateInterest({
        principal: cashAdvanceAmount,
        monthlyRate: cashAdvanceRate,
        days,
        kkdfRate,
        bsmvRate,
    })
}

/**
 * Tam dönem faiz analizi
 * Ödeme durumuna göre hangi faizlerin uygulanacağını hesaplar.
 */
export function analyzeInterestForPeriod(params: {
    statementBalance: number
    minimumPayment: number
    paymentMade: number
    contractualRate: number
    defaultRate: number
    days: number
    kkdfRate?: number
    bsmvRate?: number
}): {
    contractualInterest: InterestResult
    defaultInterest: InterestResult
    totalInterest: InterestResult
    paymentStatus: 'FULL' | 'MINIMUM' | 'BELOW_MINIMUM' | 'NO_PAYMENT'
} {
    const {
        statementBalance,
        minimumPayment,
        paymentMade,
        contractualRate,
        defaultRate,
        days,
        kkdfRate = 0.15,
        bsmvRate = 0.15,
    } = params

    const zeroResult: InterestResult = { interest: 0, kkdf: 0, bsmv: 0, totalCost: 0 }

    // Tam ödeme → Faiz yok
    if (paymentMade >= statementBalance) {
        return {
            contractualInterest: zeroResult,
            defaultInterest: zeroResult,
            totalInterest: zeroResult,
            paymentStatus: 'FULL',
        }
    }

    const remaining = statementBalance - paymentMade

    // Asgari ödeme yapıldı → Sadece akdi faiz
    if (paymentMade >= minimumPayment) {
        const contractual = calculateContractualInterest(remaining, contractualRate, days, kkdfRate, bsmvRate)
        return {
            contractualInterest: contractual,
            defaultInterest: zeroResult,
            totalInterest: contractual,
            paymentStatus: 'MINIMUM',
        }
    }

    // Asgari altı ödeme → Akdi faiz + gecikme faizi
    const unpaidMinimum = minimumPayment - paymentMade
    const contractual = calculateContractualInterest(remaining, contractualRate, days, kkdfRate, bsmvRate)
    const defaultInt = calculateDefaultInterest(unpaidMinimum, defaultRate, days, kkdfRate, bsmvRate)

    return {
        contractualInterest: contractual,
        defaultInterest: defaultInt,
        totalInterest: {
            interest: round(contractual.interest + defaultInt.interest),
            kkdf: round(contractual.kkdf + defaultInt.kkdf),
            bsmv: round(contractual.bsmv + defaultInt.bsmv),
            totalCost: round(contractual.totalCost + defaultInt.totalCost),
        },
        paymentStatus: paymentMade > 0 ? 'BELOW_MINIMUM' : 'NO_PAYMENT',
    }
}

/**
 * "Sadece asgari ödersem ne olur?" simülasyonu.
 * Borcun kapanma süresini ve toplam maliyeti hesaplar.
 */
export function simulateMinimumPaymentTrap(params: {
    currentDebt: number
    minPaymentRate: number
    contractualRate: number
    kkdfRate?: number
    bsmvRate?: number
    maxMonths?: number
}): {
    months: number
    totalPaid: number
    totalInterest: number
    totalTax: number
    monthlyBreakdown: Array<{
        month: number
        payment: number
        interest: number
        principal: number
        remaining: number
    }>
} {
    const {
        currentDebt,
        minPaymentRate,
        contractualRate,
        kkdfRate = 0.15,
        bsmvRate = 0.15,
        maxMonths = 120,
    } = params

    let remaining = currentDebt
    let totalPaid = 0
    let totalInterest = 0
    let totalTax = 0
    const breakdown: Array<{
        month: number
        payment: number
        interest: number
        principal: number
        remaining: number
    }> = []

    for (let month = 1; month <= maxMonths && remaining > 1; month++) {
        const minPayment = Math.max(remaining * minPaymentRate, 50) // En az 50 TL
        const payment = Math.min(minPayment, remaining)

        const interestResult = calculateInterest({
            principal: remaining - payment,
            monthlyRate: contractualRate,
            days: 30,
            kkdfRate,
            bsmvRate,
        })

        const principalPaid = payment
        remaining = remaining - payment + interestResult.totalCost
        totalPaid += payment
        totalInterest += interestResult.interest
        totalTax += interestResult.kkdf + interestResult.bsmv

        breakdown.push({
            month,
            payment: round(payment),
            interest: round(interestResult.totalCost),
            principal: round(principalPaid),
            remaining: round(Math.max(remaining, 0)),
        })

        if (remaining <= 1) break
    }

    return {
        months: breakdown.length,
        totalPaid: round(totalPaid),
        totalInterest: round(totalInterest),
        totalTax: round(totalTax),
        monthlyBreakdown: breakdown,
    }
}

function round(n: number): number {
    return Math.round(n * 100) / 100
}
