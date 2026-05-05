import type { Asset, Debt, CreditCard } from "@prisma/client"
import { calculateAssetValue, MarketRates } from "./market-data"

type CardTransaction = { type: string; amount: number }
type CardPayment = { amount: number }
type CardWithActivity = CreditCard & { transactions: CardTransaction[]; payments: CardPayment[] }

interface RiskAnalysis {
    score: number // 0-100
    level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'GOOD' | 'EXCELLENT'
    liquidityRatio: number
    leverageRatio: number
    debtServiceLoad: number // Tahmini aylık ödeme yükü
    warnings: string[]
}

/**
 * Kullanıcının finansal sağlığını 0-100 arası puanlar.
 */
export function calculateRiskScore(
    assets: Asset[],
    debts: Debt[],
    marketRates: MarketRates,
    creditCards: CardWithActivity[] = []
): RiskAnalysis {
    let totalAssetsTL = 0
    let liquidAssetsTL = 0

    assets.forEach(asset => {
        const value = calculateAssetValue(asset.amount, asset.type, asset.currency, marketRates)
        totalAssetsTL += value
        if (['CASH', 'BANK', 'GOLD', 'FX', 'CRYPTO'].includes(asset.type)) {
            liquidAssetsTL += value
        }
    })

    let totalDebtTL = 0
    let monthlyDebtPayment = 0

    // Konvansiyonel Borçlar
    debts.forEach(debt => {
        totalDebtTL += debt.remainingBalance
        if (debt.type === 'LOAN') {
            monthlyDebtPayment += (debt.remainingBalance / (debt.remainingInstallments || 12))
        } else if (debt.type === 'KMH') {
            monthlyDebtPayment += debt.remainingBalance * 0.05
        }
    })

    // Kredi Kartı Borçları
    let highUtilizationDetected = false
    creditCards.forEach(card => {
        const charges = card.transactions
            .filter((transaction) => transaction.type !== 'REFUND')
            .reduce((sum, transaction) => sum + transaction.amount, 0)

        const refunds = card.transactions
            .filter((transaction) => transaction.type === 'REFUND')
            .reduce((sum, transaction) => sum + transaction.amount, 0)

        const payments = card.payments
            .reduce((sum, payment) => sum + payment.amount, 0)

        const debt = Math.max(charges - refunds - payments, 0)

        totalDebtTL += debt

        // Kart asgari yükü (%20-40)
        const minRate = card.totalLimit > 50000 ? 0.40 : 0.20
        monthlyDebtPayment += debt * minRate

        const utilization = card.totalLimit > 0 ? (debt / card.totalLimit) : 0
        if (utilization > 0.9) highUtilizationDetected = true
    })

    // 1. Borçluluk Oranı (Leverage): Borç / Varlık
    // İdeal: < %30. %100 üzeri teknik iflas.
    const leverageRatio = totalAssetsTL > 0 ? (totalDebtTL / totalAssetsTL) : (totalDebtTL > 0 ? 10 : 0)

    // 2. Likidite Oranı: Likit Varlık / Toplam Borç
    // Borçların tamamını kapatabilecek nakit var mı?
    const liquidityRatio = totalDebtTL > 0 ? (liquidAssetsTL / totalDebtTL) : 10

    // Puanlama Algoritması (Base: 100)
    let score = 100
    const warnings: string[] = []

    // Kural 1: Net Varlık Negatifse direkt büyük ceza
    if (totalAssetsTL < totalDebtTL) {
        score -= 40
        warnings.push("Teknik İflas: Borçlarınız varlıklarınızdan fazla.")
    }

    // Kural 2: Borçluluk Oranı Cezası
    if (leverageRatio > 0.8) {
        score -= 30
        warnings.push("Aşırı Borçlanma: Varlıklarınızın %80'inden fazlası kadar borcunuz var.")
    } else if (leverageRatio > 0.5) {
        score -= 15
        warnings.push("Yüksek Borçluluk: Borçlarınız varlıklarınızın yarısını aşıyor.")
    }

    // Kural 3: Kredi Kartı Limit Kullanımı
    if (highUtilizationDetected) {
        score -= 15
        warnings.push("Limit Alarmı: Kredi kartı limitleriniz %90'ın üzerinde dolu.")
    }

    // Kural 4: Likidite Krizi
    if (liquidityRatio < 0.2 && totalDebtTL > 5000) {
        score -= 20
        warnings.push("Likidite Krizi: Acil ödemeler için yeterli nakdiniz yok.")
    }

    // Kural 5: KMH Kullanımı (Tehlikeli Sinyal)
    const kmhDebt = debts.find(d => d.type === 'KMH')
    if (kmhDebt && kmhDebt.remainingBalance > 1000) {
        score -= 10
        warnings.push("KMH Alarmı: Ek hesap faizi bütçenizi eritiyor.")
    }

    // Normalizasyon (0-100 sınırı)
    score = Math.max(0, Math.min(100, Math.round(score)))

    let level: RiskAnalysis['level'] = 'GOOD'
    if (score >= 90) level = 'EXCELLENT'
    else if (score >= 70) level = 'GOOD'
    else if (score >= 50) level = 'MODERATE'
    else if (score >= 30) level = 'HIGH'
    else level = 'CRITICAL'

    return {
        score,
        level,
        liquidityRatio,
        leverageRatio,
        debtServiceLoad: monthlyDebtPayment,
        warnings
    }
}
