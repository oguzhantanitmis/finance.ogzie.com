import { describe, it, expect } from 'vitest'
import {
    calculateMinimumPayment,
    allocatePayment,
    previewPayment,
} from '@/lib/card-engine/payment-engine'

describe('calculateMinimumPayment', () => {
    it('limit ≤ 50K → %20', () => {
        const result = calculateMinimumPayment(50000, 10000)
        expect(result).toBe(2000)
    })

    it('limit > 50K → %40', () => {
        const result = calculateMinimumPayment(100000, 10000)
        expect(result).toBe(4000)
    })

    it('sınır değer: 50001 TL → %40', () => {
        expect(calculateMinimumPayment(50001, 10000)).toBe(4000)
    })

    it('asgari en az 50 TL', () => {
        const result = calculateMinimumPayment(10000, 100)
        // 100 * 0.20 = 20 → min(50, 100) = 50
        expect(result).toBe(50)
    })

    it('borç 30 TL → asgari 30 TL (borcun altında kalamaz)', () => {
        const result = calculateMinimumPayment(10000, 30)
        // min(max(6, 50), 30) = min(50, 30) = 30
        expect(result).toBe(30)
    })

    it('0 borç → 0', () => {
        // min(max(0, 50), 0) = 0
        expect(calculateMinimumPayment(50000, 0)).toBe(0)
    })

    it('manualRate parametresi çalışır', () => {
        const result = calculateMinimumPayment(10000, 10000, 0.30)
        expect(result).toBe(3000)
    })
})

describe('allocatePayment', () => {
    const fullBalances = {
        overdueInterestAndTax: 100,
        overduePrincipal: 200,
        currentInterestAndTax: 150,
        currentPrincipal: 5000,
        postStatementCharges: 300,
        cashAdvanceBalance: 500,
    }

    it('tam ödeme → hepsi dağıtılır', () => {
        const total = 100 + 200 + 150 + 5000 + 300 + 500
        const result = allocatePayment(total, fullBalances)
        expect(result.totalAllocated).toBe(total)
        expect(result.remainder).toBe(0)
    })

    it('kısmi ödeme → öncelik sırasına göre', () => {
        const result = allocatePayment(250, fullBalances)
        // Önce gecikmiş faiz (100), sonra gecikmiş anapara (150/200)
        expect(result.overdueInterestAndTax).toBe(100)
        expect(result.overduePrincipal).toBe(150) // kalan 250-100=150
        expect(result.currentInterestAndTax).toBe(0)
    })

    it('0 ödeme → hiçbir şey dağıtılmaz', () => {
        const result = allocatePayment(0, fullBalances)
        expect(result.totalAllocated).toBe(0)
    })

    it('fazla ödeme → remainder > 0', () => {
        const total = 100 + 200 + 150 + 5000 + 300 + 500
        const result = allocatePayment(total + 1000, fullBalances)
        expect(result.remainder).toBe(1000)
    })

    it('6 katman sırası doğru', () => {
        // 350 → gecikmiş faiz (100) + gecikmiş anapara (200) + cari faiz (50)
        const result = allocatePayment(350, fullBalances)
        expect(result.overdueInterestAndTax).toBe(100)
        expect(result.overduePrincipal).toBe(200)
        expect(result.currentInterestAndTax).toBe(50)
        expect(result.currentPrincipal).toBe(0)
    })
})

describe('previewPayment', () => {
    const baseParams = {
        paymentAmount: 5000,
        currentDebt: 10000,
        statementBalance: 10000,
        minimumPayment: 2000,
        interestAndTaxAccrued: 500,
        cashAdvanceBalance: 0,
        postStatementCharges: 0,
        contractualRate: 3.5,
    }

    it('kalan borç hesaplanır', () => {
        const result = previewPayment(baseParams)
        expect(result.remainingDebt).toBe(5000)
    })

    it('asgari karşılandı', () => {
        const result = previewPayment(baseParams)
        expect(result.minimumSatisfied).toBe(true)
    })

    it('asgari altı ödeme', () => {
        const result = previewPayment({ ...baseParams, paymentAmount: 1000 })
        expect(result.minimumSatisfied).toBe(false)
    })

    it('tam ödeme → kalan 0', () => {
        const result = previewPayment({ ...baseParams, paymentAmount: 10000 })
        expect(result.remainingDebt).toBe(0)
    })

    it('30 günlük faiz projeksiyonu mevcut', () => {
        const result = previewPayment(baseParams)
        expect(result.projectedInterest).toBeDefined()
        expect(result.projectedInterest.interest).toBeGreaterThanOrEqual(0)
    })

    it('allocation detayları dolu', () => {
        const result = previewPayment(baseParams)
        expect(result.allocation.totalAllocated).toBeGreaterThan(0)
    })
})
