import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        creditCard: { findMany: vi.fn() },
        debt: { findMany: vi.fn() },
        receivablePayable: { findMany: vi.fn() },
        account: { findMany: vi.fn() },
    },
}))

vi.mock('@/lib/card-finance-settings-service', () => ({
    getEffectiveRates: vi.fn(),
}))

import { getEffectiveRates } from '@/lib/card-finance-settings-service'
import { generatePaymentPlan } from '@/lib/debt-priority-engine'
import { prisma } from '@/lib/prisma'

describe('generatePaymentPlan', () => {
    const mockedPrisma = prisma as unknown as {
        creditCard: { findMany: ReturnType<typeof vi.fn> }
        debt: { findMany: ReturnType<typeof vi.fn> }
        receivablePayable: { findMany: ReturnType<typeof vi.fn> }
        account: { findMany: ReturnType<typeof vi.fn> }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockedPrisma.creditCard.findMany.mockResolvedValue([])
        mockedPrisma.receivablePayable.findMany.mockResolvedValue([])
        mockedPrisma.account.findMany.mockResolvedValue([{ balance: 100000 }])
        vi.mocked(getEffectiveRates).mockResolvedValue({
            contractualRate: 4.49,
            defaultRate: 5.84,
            cashAdvanceRate: 5.92,
            minPaymentRate: 0.2,
            kkdfRate: 0.15,
            bsmvRate: 0.15,
            source: 'card',
        })
    })

    it('seçili ayda taksit yoksa ilk unpaid taksiti zorunlu ödeme kabul eder', async () => {
        mockedPrisma.debt.findMany.mockResolvedValue([
            {
                id: 'loan-1',
                name: 'Yapılandırılmış Kredi',
                remainingBalance: 343156.99,
                interestRate: 4.49,
                dueDate: null,
                paymentPlan: [
                    {
                        id: 'plan-1',
                        amount: 40565.77,
                        dueDate: new Date('2026-04-04T00:00:00.000Z'),
                    },
                ],
            },
        ])

        const result = await generatePaymentPlan('user-1', 'SAFE', undefined, new Date('2026-03-01T00:00:00.000Z'))

        expect(result.totalRequiredPayment).toBe(40565.77)
        expect(result.items[0]).toMatchObject({
            id: 'loan-1',
            requiredPayment: 40565.77,
        })
        expect(result.items[0].dueDate?.toISOString()).toContain('2026-04-04')
    })
})
