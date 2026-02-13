// ============================================================
// 🏦 OGZIE FINANCE OS — Vergi Hesaplama Motoru
// KKDF & BSMV — Türk Bankacılık Mevzuatı
// ============================================================

/**
 * Varsayılan vergi oranları (TCMB / BDDK düzenlemeleri)
 */
export const DEFAULT_TAX_RATES = {
    KKDF: 0.15, // Kaynak Kullanımını Destekleme Fonu (%15)
    BSMV: 0.15, // Banka ve Sigorta Muameleleri Vergisi (%15)
} as const

/**
 * Faiz tutarına vergi hesapla.
 * Vergiler SADECE faiz tutarına uygulanır, anaparaya DEĞİL.
 */
export function calculateTax(
    interestAmount: number,
    kkdfRate: number = DEFAULT_TAX_RATES.KKDF,
    bsmvRate: number = DEFAULT_TAX_RATES.BSMV
): { kkdf: number; bsmv: number; totalTax: number; totalWithInterest: number } {
    if (interestAmount <= 0) {
        return { kkdf: 0, bsmv: 0, totalTax: 0, totalWithInterest: 0 }
    }

    const kkdf = round(interestAmount * kkdfRate)
    const bsmv = round(interestAmount * bsmvRate)
    const totalTax = round(kkdf + bsmv)

    return {
        kkdf,
        bsmv,
        totalTax,
        totalWithInterest: round(interestAmount + totalTax),
    }
}

/**
 * Toplam maliyet çarpanı.
 * Faiz × (1 + KKDF + BSMV) = Faiz × 1.30
 */
export function getTotalCostMultiplier(
    kkdfRate: number = DEFAULT_TAX_RATES.KKDF,
    bsmvRate: number = DEFAULT_TAX_RATES.BSMV
): number {
    return 1 + kkdfRate + bsmvRate
}

/**
 * Şeffaf maliyet gösterimi için formatlı obje.
 * UI'da kullanılmak üzere.
 */
export function formatCostBreakdown(
    interestAmount: number,
    kkdfRate: number = DEFAULT_TAX_RATES.KKDF,
    bsmvRate: number = DEFAULT_TAX_RATES.BSMV
): {
    label: string
    items: Array<{ name: string; rate: string; amount: number }>
    total: number
} {
    const tax = calculateTax(interestAmount, kkdfRate, bsmvRate)

    return {
        label: 'Faiz Maliyeti Detayı',
        items: [
            { name: 'İşleyen Faiz', rate: '-', amount: round(interestAmount) },
            { name: 'KKDF', rate: `%${(kkdfRate * 100).toFixed(0)}`, amount: tax.kkdf },
            { name: 'BSMV', rate: `%${(bsmvRate * 100).toFixed(0)}`, amount: tax.bsmv },
        ],
        total: tax.totalWithInterest,
    }
}

function round(n: number): number {
    return Math.round(n * 100) / 100
}
