// Sabitler (TCMB ve Mevzuat)
export const TAX_RATES = {
    KKDF: 0.15,
    BSMV: 0.15,
}

type TaxRateInput = {
    kkdfRate?: number
    bsmvRate?: number
}

function resolveTaxRates(taxRates?: TaxRateInput) {
    const kkdfRate = typeof taxRates?.kkdfRate === 'number' ? taxRates.kkdfRate : TAX_RATES.KKDF
    const bsmvRate = typeof taxRates?.bsmvRate === 'number' ? taxRates.bsmvRate : TAX_RATES.BSMV

    return {
        kkdfRate,
        bsmvRate,
        totalTaxRate: kkdfRate + bsmvRate,
    }
}

function roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

// Güncel Vergili Faiz Hesaplama
export function calculateAccumulatedInterest(principal: number, monthlyRate: number, days: number, taxRates?: TaxRateInput): { interest: number, tax: number, total: number } {
    // Günlük Faiz Formülü: (Anapara * AylıkFaiz * Gün) / 3000
    // Not: Bankalar genelde 30 gün üzerinden hesaplar.

    const { totalTaxRate } = resolveTaxRates(taxRates)
    const interest = (principal * monthlyRate * days) / 3000
    const tax = interest * totalTaxRate

    return {
        interest: Number(interest.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number((interest + tax).toFixed(2))
    }
}

// Kredi Kartı Asgari Ödeme Hesaplama
export function calculateMinPayment(limit: number, totalDebt: number): number {
    const rate = limit > 50000 ? 0.40 : 0.20
    return Number((totalDebt * rate).toFixed(2))
}

// Eşit Taksitli Kredi Hesaplama (Annuity)
export function calculateLoanSchedule(principal: number, monthlyRate: number, installments: number, taxRates?: TaxRateInput): {
    monthlyPayment: number,
    totalPayment: number,
    plan: { installment: number, principal: number, interest: number, tax: number, remainingPrincipal: number }[]
} {
    const { kkdfRate, bsmvRate, totalTaxRate } = resolveTaxRates(taxRates)

    // Faiz 0 ise (Elden borç vb)
    if (monthlyRate === 0) {
        const payment = principal / installments
        let remainingPrincipal = principal
        const plan = Array.from({ length: installments }).map((_, i) => {
            const principalPart = i === installments - 1 ? remainingPrincipal : roundCurrency(payment)
            remainingPrincipal = roundCurrency(Math.max(0, remainingPrincipal - principalPart))

            return {
                installment: i + 1,
                principal: principalPart,
                interest: 0,
                tax: 0,
                remainingPrincipal
            }
        })
        const totalPayment = plan.reduce((total, item) => total + item.principal, 0)
        return { monthlyPayment: roundCurrency(payment), totalPayment: roundCurrency(totalPayment), plan }
    }

    const r = monthlyRate / 100
    const n = installments

    // Taksit Formülü: P * [r(1+r)^n] / [(1+r)^n - 1]
    // Ancak Türkiye'de KKDF/BSMV faiz tutarına eklenir, bu yüzden efektif faiz değişir.
    // Basit olması adına vergi hariç faiz üzerinden taksit hesaplayıp, tabloya vergiyi ekleyeceğiz.

    // Banka formülü (Genelde BSMV/KKDF taksit içindedir):
    // Efektif Oran = r * (1 + KKDF + BSMV)
    const effectiveRate = r * (1 + totalTaxRate)

    const monthlyPayment = principal * (effectiveRate * Math.pow(1 + effectiveRate, n)) / (Math.pow(1 + effectiveRate, n) - 1)
    const roundedMonthlyPayment = roundCurrency(monthlyPayment)

    let remainingPrincipal = principal
    const plan = []

    for (let i = 1; i <= n; i++) {
        const pureInterest = roundCurrency(remainingPrincipal * r)
        const kkdfTax = roundCurrency(pureInterest * kkdfRate)
        const bsmvTax = roundCurrency(pureInterest * bsmvRate)
        const taxVal = roundCurrency(kkdfTax + bsmvTax)
        let principalPart = roundCurrency(roundedMonthlyPayment - pureInterest - taxVal)
        if (i === n) {
            principalPart = roundCurrency(remainingPrincipal)
        }

        remainingPrincipal = roundCurrency(Math.max(0, remainingPrincipal - principalPart))

        plan.push({
            installment: i,
            principal: principalPart,
            interest: pureInterest,
            tax: taxVal,
            remainingPrincipal
        })
    }

    const totalPayment = plan.reduce((total, item) => total + item.principal + item.interest + item.tax, 0)

    return {
        monthlyPayment: roundedMonthlyPayment,
        totalPayment: roundCurrency(totalPayment),
        plan
    }
}

// Net Varlık Hesaplama
export function calculateNetWorth(assets: { amount: number, unitPrice?: number | null, currency: string, type: string }[], debts: { remainingBalance: number }[]) {
    // Varlıkların TL karşılığı (Şimdilik unitPrice veya amount * 1 varsayıyoruz, canlı kur entegrasyonu sonra)
    // Eğer unitPrice varsa (Altın gibi) onu kullan, yoksa amount (TL cash)

    // Mock kurlar (Daha sonra servisten gelecek)
    const RATES: Record<string, number> = {
        'USD': 32.50,
        'EUR': 35.10,
        'GBP': 41.20,
        'TRY': 1,
        'TL': 1
    }

    // Altın gram fiyatları (Mock)
    const GOLD_PRICE = 2450 // Has Altın Toptan

    let totalAssets = 0

    assets.forEach(asset => {
        if (asset.type === 'GOLD') {
            totalAssets += asset.amount * (asset.unitPrice || GOLD_PRICE)
        } else if (asset.type === 'FX' && RATES[asset.currency]) {
            totalAssets += asset.amount * RATES[asset.currency]
        } else if (['CASH', 'BANK'].includes(asset.type)) {
            totalAssets += asset.amount
        } else {
            // Diğerleri için varsayılan
            totalAssets += asset.amount
        }
    })

    const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0)

    return {
        totalAssets: Number(totalAssets.toFixed(2)),
        totalDebts: Number(totalDebts.toFixed(2)),
        netWorth: Number((totalAssets - totalDebts).toFixed(2))
    }
}
