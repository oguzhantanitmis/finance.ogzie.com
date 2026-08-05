import type { DebtSourceType, DebtType, Prisma } from '@prisma/client'

import { syncCanonicalDebtsForUser } from '@/lib/canonical-debt-service'
import { prisma } from '@/lib/prisma'

export type DebtSourceKind = 'DEBT' | 'CREDIT_CARD' | 'KMH_ACCOUNT' | 'PERSONAL_RP'

export interface DebtView {
    id: string
    entityId: string
    sourceKind: DebtSourceKind
    sourceLabel: string
    canEdit: boolean
    canDelete: boolean
    navigateHref?: string
    navigateLabel?: string
    name: string
    subtitle?: string | null
    type: DebtType
    limit?: number | null
    cutOffDay?: number | null
    paymentDueDay?: number | null
    totalBalance: number
    remainingBalance: number
    interestRate: number
    minPaymentRate: number
    kkdfRate: number
    bsmvRate: number
    totalPrincipal?: number | null
    installments?: number | null
    remainingInstallments?: number | null
    kmhStatementDate?: string | null
    kmhStatementInterest?: number | null
    kmhMinimumPayment?: number | null
    kmhMinimumPrincipalPayment?: number | null
    kmhNextCutOffDate?: string | null
    kmhNextPaymentDate?: string | null
    kmhLateInterestRate?: number | null
    dueDate?: string | null
    paymentPlan?: Array<{
        id: string
        installmentNo: number
        amount: number
        principalAmount: number
        interestAmount: number
        taxAmount: number
        dueDate: string
        isPaid: boolean
    }>
    personId?: string
    accountId?: string
}

export interface DebtPersonOption {
    id: string
    name: string
}

export type DebtPaymentObligationType = 'LOAN_INSTALLMENT' | 'KMH_MINIMUM' | 'CARD_MINIMUM' | 'CANONICAL_OBLIGATION'

export interface DebtPaymentObligation {
    id: string
    obligationId: string
    type: DebtPaymentObligationType
    sourceId: string
    name: string
    sourceLabel: string
    amount: number
    baseAmount: number
    overdueCost: number
    overdueDays: number
    dueDate: string
    balanceAfterPayment: number
    note: string
}

function roundMoney(value: number) {
    if (!Number.isFinite(value)) return 0
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function daysOverdue(dueDate: Date | null | undefined, now = new Date()) {
    if (!dueDate) return 0
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime()
    return Math.max(0, Math.floor((today - due) / dayMs))
}

function metadataObject(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
    return metadata as Record<string, unknown>
}

function metadataNumber(metadata: Prisma.JsonValue | null | undefined, key: string) {
    const value = metadataObject(metadata)[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function metadataString(metadata: Prisma.JsonValue | null | undefined, key: string) {
    const value = metadataObject(metadata)[key]
    return typeof value === 'string' ? value : null
}

function debtTypeForSource(sourceType: DebtSourceType): DebtType {
    if (sourceType === 'CREDIT_CARD') return 'CREDIT_CARD'
    if (sourceType === 'KMH') return 'KMH'
    if (sourceType === 'PERSONAL_PAYABLE') return 'PERSONAL'
    if (sourceType === 'LOAN') return 'LOAN'
    return 'MANUAL'
}

function sourceKindForSource(sourceType: DebtSourceType): DebtSourceKind {
    if (sourceType === 'CREDIT_CARD') return 'CREDIT_CARD'
    if (sourceType === 'KMH') return 'KMH_ACCOUNT'
    if (sourceType === 'PERSONAL_PAYABLE') return 'PERSONAL_RP'
    return 'DEBT'
}

function isLegacyDebt(metadata: Prisma.JsonValue | null | undefined) {
    return metadataString(metadata, 'source') === 'Debt'
}

function sourceLabelForSource(sourceType: DebtSourceType, metadata: Prisma.JsonValue | null | undefined) {
    if (isLegacyDebt(metadata)) return 'Borç kaydı'
    if (sourceType === 'CREDIT_CARD') return 'Kart borcu'
    if (sourceType === 'KMH') return 'Hesaplardan yansıyor'
    if (sourceType === 'PERSONAL_PAYABLE') return 'Kişiler sayfasından yansıyor'
    return 'Borç kaydı'
}

function obligationTypeForSource(sourceType: DebtSourceType): DebtPaymentObligationType {
    if (sourceType === 'CREDIT_CARD') return 'CARD_MINIMUM'
    if (sourceType === 'KMH') return 'KMH_MINIMUM'
    if (sourceType === 'LOAN') return 'LOAN_INSTALLMENT'
    return 'CANONICAL_OBLIGATION'
}

function navigateForDebt(input: {
    sourceType: DebtSourceType
    sourceEntityId: string | null
    metadata: Prisma.JsonValue | null
}) {
    if (input.sourceType === 'KMH') {
        return { href: '/accounts', label: 'Hesabı aç' }
    }
    if (input.sourceType === 'PERSONAL_PAYABLE') {
        const personId = metadataString(input.metadata, 'personId')
        if (personId) return { href: `/people/${personId}`, label: 'Kişiyi aç' }
    }
    return { href: undefined, label: undefined }
}

export async function getDebtWorkspaceData(
    userId: string,
    options?: { allObligations?: boolean }
): Promise<{
    debts: DebtView[]
    people: DebtPersonOption[]
    paymentObligations: DebtPaymentObligation[]
}> {
    await syncCanonicalDebtsForUser(userId)

    const [debtAccounts, people] = await Promise.all([
        prisma.debtAccount.findMany({
            where: {
                userId,
                status: { not: 'CLOSED' },
                OR: [
                    { currentBalance: { gt: 0 } },
                    { obligations: { some: { remainingAmount: { gt: 0 }, status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] } } } },
                ],
            },
            include: {
                obligations: {
                    where: { status: { not: 'CANCELED' } },
                    orderBy: [{ dueDate: 'asc' }, { installmentNo: 'asc' }],
                },
            },
            orderBy: { currentBalance: 'desc' },
        }),
        prisma.person.findMany({
            where: { userId, isActive: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const debts: DebtView[] = debtAccounts.map((debtAccount) => {
        const sourceType = debtAccount.sourceType
        const legacyDebt = isLegacyDebt(debtAccount.metadata)
        const sourceKind = legacyDebt ? 'DEBT' as const : sourceKindForSource(sourceType)
        const entityId = debtAccount.sourceEntityId ?? debtAccount.id
        const navigate = navigateForDebt({
            sourceType,
            sourceEntityId: debtAccount.sourceEntityId,
            metadata: debtAccount.metadata,
        })
        const paymentPlan = debtAccount.obligations
            .filter((obligation) => obligation.type === 'INSTALLMENT')
            .map((obligation) => ({
                id: obligation.id,
                installmentNo: obligation.installmentNo ?? 1,
                amount: obligation.totalAmount,
                principalAmount: obligation.principalAmount,
                interestAmount: obligation.interestAmount,
                taxAmount: obligation.taxAmount,
                dueDate: obligation.dueDate.toISOString(),
                isPaid: obligation.status === 'PAID',
            }))

        return {
            id: debtAccount.id,
            entityId,
            sourceKind,
            sourceLabel: sourceLabelForSource(sourceType, debtAccount.metadata),
            canEdit: sourceKind === 'DEBT' || sourceKind === 'PERSONAL_RP',
            canDelete: sourceKind === 'DEBT' || sourceKind === 'PERSONAL_RP',
            navigateHref: navigate.href,
            navigateLabel: navigate.label,
            name: debtAccount.name,
            subtitle: debtAccount.counterpartyName,
            type: debtTypeForSource(sourceType),
            limit: debtAccount.limit,
            cutOffDay: debtAccount.cutOffDay,
            paymentDueDay: debtAccount.paymentDueDay,
            totalBalance: debtAccount.statementBalance || debtAccount.currentBalance,
            remainingBalance: debtAccount.currentBalance,
            interestRate: debtAccount.interestRate,
            minPaymentRate: sourceType === 'KMH' ? 0.05 : sourceType === 'CREDIT_CARD' ? 0.20 : 0,
            kkdfRate: debtAccount.kkdfRate,
            bsmvRate: debtAccount.bsmvRate,
            totalPrincipal: debtAccount.principalBalance,
            installments: paymentPlan.length || null,
            remainingInstallments: paymentPlan.filter((item) => !item.isPaid).length || null,
            kmhStatementDate: debtAccount.statementDate?.toISOString() ?? null,
            kmhStatementInterest: metadataNumber(debtAccount.metadata, 'kmhStatementInterest'),
            kmhMinimumPayment: metadataNumber(debtAccount.metadata, 'kmhMinimumPayment'),
            kmhMinimumPrincipalPayment: metadataNumber(debtAccount.metadata, 'kmhMinimumPrincipalPayment'),
            kmhNextCutOffDate: metadataString(debtAccount.metadata, 'kmhNextCutOffDate'),
            kmhNextPaymentDate: sourceType === 'KMH' ? debtAccount.nextDueDate?.toISOString() ?? null : null,
            kmhLateInterestRate: debtAccount.lateInterestRate,
            dueDate: debtAccount.nextDueDate?.toISOString() ?? null,
            paymentPlan,
            personId: metadataString(debtAccount.metadata, 'personId') ?? undefined,
            accountId: sourceType === 'KMH' ? entityId : undefined,
        }
    })

    const allObligations = options?.allObligations ?? false
    const today = new Date()
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    const tenDaysFromNow = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)

    const paymentObligations: DebtPaymentObligation[] = debtAccounts.flatMap((debtAccount) => {
        const sourceType = debtAccount.sourceType
        return debtAccount.obligations
            .filter((obligation) => {
                const isPendingOrOverdue = ['PENDING', 'PARTIAL_PAID', 'OVERDUE'].includes(obligation.status) && obligation.remainingAmount > 0
                if (!isPendingOrOverdue) return false
                if (allObligations) return true

                const dueDate = new Date(obligation.dueDate)
                const isOverdue = obligation.status === 'OVERDUE' || daysOverdue(obligation.dueDate, today) > 0
                const isDueThisMonth = dueDate <= endOfThisMonth
                const isDueSoon = dueDate <= tenDaysFromNow

                return isOverdue || isDueThisMonth || isDueSoon
            })
            .map((obligation) => {
                const overdueDays = daysOverdue(obligation.dueDate, today)
                const baseAmount = roundMoney(obligation.remainingAmount - obligation.lateFeeAmount)
                const amount = roundMoney(obligation.remainingAmount)
                return {
                    id: obligation.id,
                    obligationId: obligation.id,
                    type: obligationTypeForSource(sourceType),
                    sourceId: obligation.id,
                    name: debtAccount.name,
                    sourceLabel: sourceType === 'CREDIT_CARD'
                        ? 'Kredi kartı'
                        : sourceType === 'KMH'
                            ? 'KMH asgari'
                            : sourceType === 'LOAN'
                                ? 'Kredi taksidi'
                                : 'Borç ödemesi',
                    amount,
                    baseAmount,
                    overdueCost: roundMoney(obligation.lateFeeAmount),
                    overdueDays,
                    dueDate: obligation.dueDate.toISOString(),
                    balanceAfterPayment: roundMoney(Math.max(0, debtAccount.currentBalance - amount)),
                    note: obligation.installmentNo
                        ? `${obligation.installmentNo}. taksit`
                        : overdueDays > 0
                            ? 'Ödeme gecikmiş'
                            : 'Ödeme bekliyor',
                }
            })
    }).sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())

    return {
        debts,
        people,
        paymentObligations,
    }
}

export async function getDebtPaymentObligations(userId: string): Promise<DebtPaymentObligation[]> {
    const workspaceData = await getDebtWorkspaceData(userId, { allObligations: true })
    return workspaceData.paymentObligations
}
