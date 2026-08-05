import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DebtAccount, Person } from '@prisma/client'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        debtAccount: {
            findMany: vi.fn(),
        },
        person: {
            findMany: vi.fn(),
        },
    },
}))

vi.mock('@/lib/canonical-debt-service', () => ({
    syncCanonicalDebtsForUser: vi.fn(),
}))

describe('getDebtWorkspaceData', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        // Sistemi 21 Mayıs 2026 tarihine sabitle
        vi.setSystemTime(new Date('2026-05-21T12:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('vadesi gelmemiş ve 10 günden uzak ödemeleri varsayılan olarak filtrelemeli', async () => {
        const mockPeople = [{ id: 'person-1', name: 'Ahmet' }]
        
        // 21 Mayıs 2026'ya göre test tarihleri:
        // 1. Gecikmiş (10 Mayıs)
        // 2. Bu ay sonu (28 Mayıs)
        // 3. Gelecek ay başı, 10 gün içinde (28 Mayıs + 10 gün = 31 Mayıs, 1 Haziran sınırda)
        // 4. Gelecek ay ortası, >10 gün (15 Haziran)
        const mockDebtAccounts = [
            {
                id: 'debt-1',
                userId: 'user-1',
                sourceType: 'LOAN',
                sourceEntityId: 'loan-1',
                name: 'Taşıt Kredisi',
                counterpartyName: 'X Bankası',
                currency: 'TRY',
                status: 'ACTIVE',
                limit: null,
                principalBalance: 50000,
                statementBalance: 0,
                currentBalance: 50000,
                interestRate: 3.5,
                lateInterestRate: 4.5,
                kkdfRate: 0.15,
                bsmvRate: 0.15,
                cutOffDay: null,
                paymentDueDay: null,
                statementDate: null,
                nextDueDate: new Date('2026-05-10T00:00:00Z'),
                metadata: {},
                obligations: [
                    {
                        id: 'ob-1', // Gecikmiş ödeme (10 Mayıs)
                        type: 'INSTALLMENT',
                        installmentNo: 1,
                        dueDate: new Date('2026-05-10T00:00:00Z'),
                        remainingAmount: 5000,
                        lateFeeAmount: 150,
                        totalAmount: 5000,
                        principalAmount: 4000,
                        interestAmount: 800,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                    {
                        id: 'ob-2', // Bu ay içinde ödeme (28 Mayıs)
                        type: 'INSTALLMENT',
                        installmentNo: 2,
                        dueDate: new Date('2026-05-28T00:00:00Z'),
                        remainingAmount: 5000,
                        lateFeeAmount: 0,
                        totalAmount: 5000,
                        principalAmount: 4100,
                        interestAmount: 700,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                    {
                        id: 'ob-3', // Gelecek ay başı, 10 gün içinde (30 Mayıs -> 30 Mayıs + 10 gün = 31 Mayıs, 1 Haziran 11 gün sonra)
                        // Önümüzdeki 10 gün: 21 Mayıs + 10 gün = 31 Mayıs sonu.
                        // 1 Haziran: 11 gün sonra.
                        type: 'INSTALLMENT',
                        installmentNo: 3,
                        dueDate: new Date('2026-05-30T00:00:00Z'), // 9 gün sonra
                        remainingAmount: 5000,
                        lateFeeAmount: 0,
                        totalAmount: 5000,
                        principalAmount: 4200,
                        interestAmount: 600,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                    {
                        id: 'ob-4', // Gelecek ay ortası, >10 gün (15 Haziran)
                        type: 'INSTALLMENT',
                        installmentNo: 4,
                        dueDate: new Date('2026-06-15T00:00:00Z'), // Haziranda ve 25 gün sonra
                        remainingAmount: 5000,
                        lateFeeAmount: 0,
                        totalAmount: 5000,
                        principalAmount: 4300,
                        interestAmount: 500,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                ],
            },
        ]

        vi.mocked(prisma.debtAccount.findMany).mockResolvedValue(mockDebtAccounts as unknown as DebtAccount[])
        vi.mocked(prisma.person.findMany).mockResolvedValue(mockPeople as unknown as Person[])

        // 1. varsayılan filtreleme (allObligations = false veya tanımsız)
        const result = await getDebtWorkspaceData('user-1')

        // ob-1, ob-2, ob-3 dönmeli; ob-4 (15 Haziran) filtrelenmeli
        expect(result.paymentObligations).toHaveLength(3)
        const returnedIds = result.paymentObligations.map(o => o.id)
        expect(returnedIds).toContain('ob-1')
        expect(returnedIds).toContain('ob-2')
        expect(returnedIds).toContain('ob-3')
        expect(returnedIds).not.toContain('ob-4')
    })

    it('allObligations seçeneği true ise filtreleme yapmadan hepsini getirmeli', async () => {
        const mockPeople = [{ id: 'person-1', name: 'Ahmet' }]
        const mockDebtAccounts = [
            {
                id: 'debt-1',
                userId: 'user-1',
                sourceType: 'LOAN',
                sourceEntityId: 'loan-1',
                name: 'Taşıt Kredisi',
                counterpartyName: 'X Bankası',
                currency: 'TRY',
                status: 'ACTIVE',
                limit: null,
                principalBalance: 50000,
                statementBalance: 0,
                currentBalance: 50000,
                interestRate: 3.5,
                lateInterestRate: 4.5,
                kkdfRate: 0.15,
                bsmvRate: 0.15,
                cutOffDay: null,
                paymentDueDay: null,
                statementDate: null,
                nextDueDate: new Date('2026-05-10T00:00:00Z'),
                metadata: {},
                obligations: [
                    {
                        id: 'ob-1',
                        type: 'INSTALLMENT',
                        installmentNo: 1,
                        dueDate: new Date('2026-05-10T00:00:00Z'),
                        remainingAmount: 5000,
                        lateFeeAmount: 0,
                        totalAmount: 5000,
                        principalAmount: 4000,
                        interestAmount: 800,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                    {
                        id: 'ob-4', // Gelecek ay ortası, >10 gün (15 Haziran)
                        type: 'INSTALLMENT',
                        installmentNo: 4,
                        dueDate: new Date('2026-06-15T00:00:00Z'),
                        remainingAmount: 5000,
                        lateFeeAmount: 0,
                        totalAmount: 5000,
                        principalAmount: 4300,
                        interestAmount: 500,
                        taxAmount: 200,
                        status: 'PENDING',
                    },
                ],
            },
        ]

        vi.mocked(prisma.debtAccount.findMany).mockResolvedValue(mockDebtAccounts as unknown as DebtAccount[])
        vi.mocked(prisma.person.findMany).mockResolvedValue(mockPeople as unknown as Person[])

        const result = await getDebtWorkspaceData('user-1', { allObligations: true })

        // Hem ob-1 hem de ob-4 dönmeli
        expect(result.paymentObligations).toHaveLength(2)
        const returnedIds = result.paymentObligations.map(o => o.id)
        expect(returnedIds).toContain('ob-1')
        expect(returnedIds).toContain('ob-4')
    })

    it('kart kaynağını salt okunur, manuel kart borcunu düzenlenebilir göstermeli', async () => {
        const baseCard = {
            userId: 'user-1',
            sourceType: 'CREDIT_CARD',
            counterpartyName: 'Banka',
            currency: 'TRY',
            status: 'ACTIVE',
            limit: null,
            principalBalance: 0,
            statementBalance: 12500,
            currentBalance: 10000,
            interestRate: 4.25,
            lateInterestRate: 4.55,
            kkdfRate: 0.15,
            bsmvRate: 0.15,
            cutOffDay: null,
            paymentDueDay: null,
            statementDate: null,
            nextDueDate: new Date('2026-05-28T00:00:00Z'),
            obligations: [],
        }
        const mockDebtAccounts = [
            {
                ...baseCard,
                id: 'canonical-card',
                sourceEntityId: 'credit-card-1',
                name: 'Banka kart borcu',
                metadata: { source: 'CreditCard' },
            },
            {
                ...baseCard,
                id: 'manual-card',
                sourceEntityId: 'legacy-debt-1',
                name: 'Manuel kart borcu',
                metadata: { source: 'Debt', legacyDebtId: 'legacy-debt-1' },
            },
        ]

        vi.mocked(prisma.debtAccount.findMany).mockResolvedValue(mockDebtAccounts as unknown as DebtAccount[])
        vi.mocked(prisma.person.findMany).mockResolvedValue([])

        const result = await getDebtWorkspaceData('user-1')
        const canonicalCard = result.debts.find((debt) => debt.id === 'canonical-card')
        const manualCard = result.debts.find((debt) => debt.id === 'manual-card')

        expect(canonicalCard).toMatchObject({
            sourceKind: 'CREDIT_CARD',
            sourceLabel: 'Kart borcu',
            canEdit: false,
            canDelete: false,
            navigateHref: undefined,
        })
        expect(manualCard).toMatchObject({
            sourceKind: 'DEBT',
            sourceLabel: 'Borç kaydı',
            canEdit: true,
            canDelete: true,
            navigateHref: undefined,
        })
    })
})
