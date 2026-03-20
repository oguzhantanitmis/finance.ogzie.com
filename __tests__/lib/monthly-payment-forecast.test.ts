import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        paymentPlan: { findMany: vi.fn() },
        cardStatement: { findMany: vi.fn() },
        debt: { findMany: vi.fn() },
        subscription: { findMany: vi.fn() },
        recurringExpense: { findMany: vi.fn() },
    },
}))

import { getMonthlyPaymentForecast, resolveDashboardMonth } from '@/lib/monthly-payment-forecast'
import { prisma } from '@/lib/prisma'
import { formatDateInputValue } from '@/lib/utils'

describe('monthly payment forecast', () => {
    const mockedPrisma = prisma as unknown as {
        paymentPlan: { findMany: ReturnType<typeof vi.fn> }
        cardStatement: { findMany: ReturnType<typeof vi.fn> }
        debt: { findMany: ReturnType<typeof vi.fn> }
        subscription: { findMany: ReturnType<typeof vi.fn> }
        recurringExpense: { findMany: ReturnType<typeof vi.fn> }
    }

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'))
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('geçersiz veya geçmiş ay isteklerini mevcut aya clamp eder', () => {
        const now = new Date('2026-03-21T10:00:00.000Z')

        expect(formatDateInputValue(resolveDashboardMonth(undefined, now))).toBe('2026-03-01')
        expect(formatDateInputValue(resolveDashboardMonth('2026-02-01', now))).toBe('2026-03-01')
        expect(formatDateInputValue(resolveDashboardMonth('2026-05', now))).toBe('2026-05-01')
    })

    it('seçili ay için gerçek ve tahmini ödeme kalemlerini birleştirir', async () => {
        mockedPrisma.paymentPlan.findMany.mockResolvedValue([
            {
                id: 'pp-1',
                installmentNo: 1,
                amount: 40565.77,
                principalAmount: 20535.7,
                interestAmount: 15407.75,
                taxAmount: 4622.32,
                dueDate: new Date('2026-04-04T00:00:00.000Z'),
                isPaid: false,
                paidDate: null,
                debt: {
                    id: 'loan-1',
                    name: 'Yapılandırılmış Kredi',
                },
            },
        ])
        mockedPrisma.cardStatement.findMany.mockResolvedValue([
            {
                id: 'stmt-1',
                dueDate: new Date('2026-04-10T00:00:00.000Z'),
                minimumPayment: 5000,
                statementBalance: 15000,
                status: 'OPEN',
                paymentsReceived: 0,
                creditCard: {
                    id: 'card-1',
                    cardName: 'Axess',
                },
            },
        ])
        mockedPrisma.debt.findMany.mockResolvedValue([
            {
                id: 'manual-1',
                name: 'Vergi Borcu',
                type: 'MANUAL',
                remainingBalance: 2000,
                dueDate: new Date('2026-04-05T00:00:00.000Z'),
            },
        ])
        mockedPrisma.subscription.findMany.mockResolvedValue([
            {
                id: 'sub-1',
                name: 'Netflix',
                amount: 380,
                currency: 'TRY',
                billingCycle: 'MONTHLY',
                billingAnchorDay: 15,
                nextPayment: new Date('2026-03-15T00:00:00.000Z'),
                autopay: true,
                category: 'Eğlence',
            },
        ])
        mockedPrisma.recurringExpense.findMany.mockResolvedValue([
            {
                id: 'rec-1',
                name: 'Aidat',
                amount: 1250,
                currency: 'TRY',
                billingCycle: 'YEARLY',
                billingAnchorDay: 20,
                nextPayment: new Date('2026-04-20T00:00:00.000Z'),
                autopay: false,
                category: 'Barınma',
                isEssential: true,
            },
        ])

        const forecast = await getMonthlyPaymentForecast('user-1', new Date('2026-04-01T00:00:00.000Z'))
        const bySource = Object.fromEntries(forecast.items.map((item) => [item.source, item]))

        expect(forecast.totalScheduled).toBe(49195.77)
        expect(bySource.loan_installment.status).toBe('OVERDUE')
        expect(bySource.card_statement.status).toBe('OVERDUE')
        expect(bySource.manual_debt.status).toBe('OVERDUE')
        expect(bySource.subscription.status).toBe('PLANNED')
        expect(bySource.recurring.status).toBe('PLANNED')
    })
})
