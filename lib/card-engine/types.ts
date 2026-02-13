// ============================================================
// 🏦 OGZIE FINANCE OS — Kredi Kartı Sistemi Tip Tanımları
// ============================================================

export interface InterestResult {
    interest: number   // Saf faiz tutarı
    kkdf: number       // KKDF vergisi
    bsmv: number       // BSMV vergisi
    totalCost: number  // Faiz + KKDF + BSMV
}

export interface InterestCalculationInput {
    principal: number      // Faiz hesaplanacak anapara
    monthlyRate: number    // Aylık faiz oranı (%)
    days: number           // Gün sayısı
    kkdfRate: number       // KKDF oranı (0.15)
    bsmvRate: number       // BSMV oranı (0.15)
}

export interface PaymentAllocation {
    overdueInterestAndTax: number   // 1) Gecikmiş faiz + vergi
    overduePrincipal: number        // 2) Gecikmiş anapara
    currentInterestAndTax: number   // 3) Cari dönem faiz + vergi
    currentPrincipal: number        // 4) Cari dönem anapara
    postStatementCharges: number    // 5) Ekstre sonrası işlemler
    cashAdvance: number             // 6) Nakit avans
    totalAllocated: number          // Toplam dağıtılan
    remainder: number               // Artan tutar (limit boşalması)
}

export interface PaymentPreview {
    allocation: PaymentAllocation
    remainingDebt: number           // Ödeme sonrası kalan borç
    minimumSatisfied: boolean       // Asgari ödeme karşılandı mı?
    projectedInterest: InterestResult // 30 günlük tahmini faiz
}

export interface StatementSummary {
    statementDate: Date
    dueDate: Date
    previousBalance: number
    newCharges: number
    interestCharged: number
    taxCharged: number
    paymentsReceived: number
    statementBalance: number
    minimumPayment: number
    status: 'OPEN' | 'PAID' | 'CLOSED' | 'OVERDUE'
}

export interface CardSummary {
    id: string
    cardName: string
    bankName: string
    last4Digits: string
    color: string
    totalLimit: number
    currentDebt: number
    availableLimit: number
    utilizationPercent: number
    statementBalance: number
    minimumPayment: number
    daysUntilDue: number
    status: string
}

// Kart limit uyarı seviyeleri
export type LimitWarningLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'

export function getLimitWarningLevel(utilizationPercent: number): LimitWarningLevel {
    if (utilizationPercent >= 100) return 'CRITICAL'
    if (utilizationPercent >= 90) return 'DANGER'
    if (utilizationPercent >= 70) return 'WARNING'
    return 'SAFE'
}

export function getLimitWarningColor(level: LimitWarningLevel): string {
    switch (level) {
        case 'CRITICAL': return '#EF4444' // red
        case 'DANGER': return '#F97316'   // orange
        case 'WARNING': return '#EAB308'  // yellow
        case 'SAFE': return '#22C55E'     // green
    }
}
