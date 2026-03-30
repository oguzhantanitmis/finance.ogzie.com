import { describe, it, expect } from 'vitest'
import {
    calculateInterest,
    calculateContractualInterest,
    calculateDefaultInterest,
    calculateCashAdvanceInterest,
    analyzeInterestForPeriod,
    simulateMinimumPaymentTrap,
} from '@/lib/card-engine/interest-engine'

describe('calculateInterest', () => {
    it('temel faiz hesaplama: 10000 TL, %3.5, 30 gün', () => {
        const result = calculateInterest({
            principal: 10000,
            monthlyRate: 3.5,
            days: 30,
            kkdfRate: 0.15,
            bsmvRate: 0.15,
        })
        // interest = (10000 * 3.5 * 30) / 3000 = 350
        expect(result.interest).toBe(350)
        // kkdf = 350 * 0.15 = 52.5
        expect(result.kkdf).toBe(52.5)
        // bsmv = 350 * 0.15 = 52.5
        expect(result.bsmv).toBe(52.5)
        // total = 350 + 52.5 + 52.5 = 455
        expect(result.totalCost).toBe(455)
    })

    it('anapara 0 → sıfır sonuç', () => {
        const result = calculateInterest({ principal: 0, monthlyRate: 3.5, days: 30, kkdfRate: 0.15, bsmvRate: 0.15 })
        expect(result.interest).toBe(0)
        expect(result.totalCost).toBe(0)
    })

    it('gün 0 → sıfır sonuç', () => {
        const result = calculateInterest({ principal: 10000, monthlyRate: 3.5, days: 0, kkdfRate: 0.15, bsmvRate: 0.15 })
        expect(result.interest).toBe(0)
    })

    it('negatif anapara → sıfır', () => {
        const result = calculateInterest({ principal: -5000, monthlyRate: 3.5, days: 30, kkdfRate: 0.15, bsmvRate: 0.15 })
        expect(result.interest).toBe(0)
    })

    it('15 gün → yarım ay faiz', () => {
        const result = calculateInterest({ principal: 10000, monthlyRate: 3.5, days: 15, kkdfRate: 0.15, bsmvRate: 0.15 })
        expect(result.interest).toBe(175)
    })

    it('yüksek tutar hassasiyeti', () => {
        const result = calculateInterest({ principal: 1000000, monthlyRate: 4.0, days: 30, kkdfRate: 0.15, bsmvRate: 0.15 })
        // (1M * 4 * 30) / 3000 = 40000
        expect(result.interest).toBe(40000)
    })
})

describe('calculateContractualInterest', () => {
    it('akdi faiz hesaplar', () => {
        const result = calculateContractualInterest(20000, 3.5, 30)
        expect(result.interest).toBe(700)
    })

    it('varsayılan KKDF/BSMV %15', () => {
        const result = calculateContractualInterest(10000, 3.5, 30)
        expect(result.kkdf).toBe(52.5)
        expect(result.bsmv).toBe(52.5)
    })
})

describe('calculateDefaultInterest', () => {
    it('gecikme faizi hesaplar', () => {
        const result = calculateDefaultInterest(5000, 4.75, 30)
        // (5000 * 4.75 * 30) / 3000 = 237.5
        expect(result.interest).toBe(237.5)
    })
})

describe('calculateCashAdvanceInterest', () => {
    it('nakit avans faizi hesaplar', () => {
        const result = calculateCashAdvanceInterest(3000, 5.0, 30)
        // (3000 * 5 * 30) / 3000 = 150
        expect(result.interest).toBe(150)
    })
})

describe('analyzeInterestForPeriod', () => {
    it('tam ödeme → faiz yok', () => {
        const result = analyzeInterestForPeriod({
            statementBalance: 10000,
            minimumPayment: 2000,
            paymentMade: 10000,
            contractualRate: 3.5,
            defaultRate: 4.75,
            days: 30,
        })
        expect(result.paymentStatus).toBe('FULL')
        expect(result.totalInterest.interest).toBe(0)
    })

    it('asgari ödeme → sadece akdi faiz', () => {
        const result = analyzeInterestForPeriod({
            statementBalance: 10000,
            minimumPayment: 2000,
            paymentMade: 2000,
            contractualRate: 3.5,
            defaultRate: 4.75,
            days: 30,
        })
        expect(result.paymentStatus).toBe('MINIMUM')
        expect(result.contractualInterest.interest).toBeGreaterThan(0)
        expect(result.defaultInterest.interest).toBe(0)
    })

    it('asgari altı ödeme → akdi + gecikme faizi', () => {
        const result = analyzeInterestForPeriod({
            statementBalance: 10000,
            minimumPayment: 2000,
            paymentMade: 500,
            contractualRate: 3.5,
            defaultRate: 4.75,
            days: 30,
        })
        expect(result.paymentStatus).toBe('BELOW_MINIMUM')
        expect(result.contractualInterest.interest).toBeGreaterThan(0)
        expect(result.defaultInterest.interest).toBeGreaterThan(0)
    })

    it('ödeme yok → NO_PAYMENT', () => {
        const result = analyzeInterestForPeriod({
            statementBalance: 10000,
            minimumPayment: 2000,
            paymentMade: 0,
            contractualRate: 3.5,
            defaultRate: 4.75,
            days: 30,
        })
        expect(result.paymentStatus).toBe('NO_PAYMENT')
    })

    it('toplam faiz = akdi + gecikme', () => {
        const result = analyzeInterestForPeriod({
            statementBalance: 10000,
            minimumPayment: 2000,
            paymentMade: 500,
            contractualRate: 3.5,
            defaultRate: 4.75,
            days: 30,
        })
        const totalExpected = result.contractualInterest.totalCost + result.defaultInterest.totalCost
        expect(result.totalInterest.totalCost).toBeCloseTo(totalExpected, 1)
    })
})

describe('simulateMinimumPaymentTrap', () => {
    it('borç sonunda kapanır', () => {
        const result = simulateMinimumPaymentTrap({
            currentDebt: 5000,
            minPaymentRate: 0.20,
            contractualRate: 3.5,
            maxMonths: 120,
        })
        expect(result.months).toBeGreaterThan(0)
        expect(result.months).toBeLessThanOrEqual(120)
    })

    it('toplam ödeme > anapara (faiz etkisi)', () => {
        const result = simulateMinimumPaymentTrap({
            currentDebt: 10000,
            minPaymentRate: 0.20,
            contractualRate: 3.5,
        })
        expect(result.totalPaid).toBeGreaterThan(10000)
        expect(result.totalInterest).toBeGreaterThan(0)
    })

    it('aylık breakdown tutarlı', () => {
        const result = simulateMinimumPaymentTrap({
            currentDebt: 5000,
            minPaymentRate: 0.20,
            contractualRate: 3.5,
        })
        expect(result.monthlyBreakdown.length).toBe(result.months)
        result.monthlyBreakdown.forEach((m) => {
            expect(m.payment).toBeGreaterThan(0)
            expect(m.remaining).toBeGreaterThanOrEqual(0)
        })
    })

    it('0 borç → 0 ay', () => {
        const result = simulateMinimumPaymentTrap({
            currentDebt: 0,
            minPaymentRate: 0.20,
            contractualRate: 3.5,
        })
        expect(result.months).toBe(0)
        expect(result.totalPaid).toBe(0)
    })
})
