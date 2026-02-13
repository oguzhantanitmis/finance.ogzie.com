// ============================================================
// 🏦 OGZIE FINANCE OS — Ödeme Dağıtım Motoru
// Banka Standardında 6 Katmanlı Ödeme Dağıtımı
// ============================================================

import { PaymentAllocation, PaymentPreview, InterestResult } from './types'
import { calculateContractualInterest } from './interest-engine'

/**
 * Asgari ödeme hesaplama.
 * Türkiye kuralı:
 * - Limit ≤ 50.000 TL → Asgari %20
 * - Limit > 50.000 TL → Asgari %40
 * 
 * Manuel override mümkün.
 */
export function calculateMinimumPayment(
    limit: number,
    statementBalance: number,
    manualRate?: number
): number {
    const rate = manualRate ?? (limit > 50000 ? 0.40 : 0.20)
    const minimum = round(statementBalance * rate)
    // Asgari en az 50 TL veya tam borç
    return Math.min(Math.max(minimum, 50), statementBalance)
}

/**
 * 6 Katmanlı Ödeme Dağıtım Motoru
 * 
 * Banka öncelik sırası:
 * 1. Gecikmiş faiz ve vergi
 * 2. Gecikmiş anapara
 * 3. Cari dönem faiz ve vergi
 * 4. Cari dönem anapara
 * 5. Ekstre sonrası işlemler
 * 6. Nakit avans bakiyesi
 */
export function allocatePayment(
    paymentAmount: number,
    balances: {
        overdueInterestAndTax: number
        overduePrincipal: number
        currentInterestAndTax: number
        currentPrincipal: number
        postStatementCharges: number
        cashAdvanceBalance: number
    }
): PaymentAllocation {
    let remaining = paymentAmount

    // 1) Gecikmiş faiz ve vergi
    const allocOverdueInterest = Math.min(remaining, balances.overdueInterestAndTax)
    remaining -= allocOverdueInterest

    // 2) Gecikmiş anapara
    const allocOverduePrincipal = Math.min(remaining, balances.overduePrincipal)
    remaining -= allocOverduePrincipal

    // 3) Cari dönem faiz ve vergi
    const allocCurrentInterest = Math.min(remaining, balances.currentInterestAndTax)
    remaining -= allocCurrentInterest

    // 4) Cari dönem anapara
    const allocCurrentPrincipal = Math.min(remaining, balances.currentPrincipal)
    remaining -= allocCurrentPrincipal

    // 5) Ekstre sonrası işlemler
    const allocPostStatement = Math.min(remaining, balances.postStatementCharges)
    remaining -= allocPostStatement

    // 6) Nakit avans
    const allocCashAdvance = Math.min(remaining, balances.cashAdvanceBalance)
    remaining -= allocCashAdvance

    return {
        overdueInterestAndTax: round(allocOverdueInterest),
        overduePrincipal: round(allocOverduePrincipal),
        currentInterestAndTax: round(allocCurrentInterest),
        currentPrincipal: round(allocCurrentPrincipal),
        postStatementCharges: round(allocPostStatement),
        cashAdvance: round(allocCashAdvance),
        totalAllocated: round(paymentAmount - remaining),
        remainder: round(remaining),
    }
}

/**
 * Ödeme önizleme motoru.
 * Ödeme yapılmadan ÖNCE, kullanıcıya gösterilecek bilgileri hesaplar.
 */
export function previewPayment(params: {
    paymentAmount: number
    currentDebt: number
    statementBalance: number
    minimumPayment: number
    interestAndTaxAccrued: number
    cashAdvanceBalance: number
    postStatementCharges: number
    contractualRate: number
    kkdfRate?: number
    bsmvRate?: number
}): PaymentPreview {
    const {
        paymentAmount,
        currentDebt,
        statementBalance,
        minimumPayment,
        interestAndTaxAccrued,
        cashAdvanceBalance,
        postStatementCharges,
        contractualRate,
        kkdfRate = 0.15,
        bsmvRate = 0.15,
    } = params

    // Dağıtımı hesapla
    const allocation = allocatePayment(paymentAmount, {
        overdueInterestAndTax: 0, // Basitleştirme: gecikmiş yoksa
        overduePrincipal: 0,
        currentInterestAndTax: interestAndTaxAccrued,
        currentPrincipal: statementBalance - interestAndTaxAccrued,
        postStatementCharges,
        cashAdvanceBalance,
    })

    // Ödeme sonrası kalan borç
    const remainingDebt = round(Math.max(currentDebt - allocation.totalAllocated, 0))

    // Asgari ödeme karşılandı mı?
    const minimumSatisfied = paymentAmount >= minimumPayment

    // 30 günlük tahmini faiz projeksiyonu
    const projectedInterest = calculateContractualInterest(
        remainingDebt,
        contractualRate,
        30,
        kkdfRate,
        bsmvRate
    )

    return {
        allocation,
        remainingDebt,
        minimumSatisfied,
        projectedInterest,
    }
}

function round(n: number): number {
    return Math.round(n * 100) / 100
}
