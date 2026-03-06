'use server'

import {
    AssetType,
    BillingCycle,
    BudgetAlertState,
    DebtType,
    RecordStatus,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { startOfMonth } from 'date-fns'

import { getMonthlyBudgetSummary, normalizeMonthlyAmount } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { syncBudgetAlerts } from '@/lib/reminder-engine'
import { requireCurrentUser } from '@/lib/server-auth'
import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

const REVALIDATE_PATHS = ['/', '/subscriptions', '/recurring', '/budget', '/analytics']

function revalidateFinancePaths(extraPaths: string[] = []) {
    [...REVALIDATE_PATHS, ...extraPaths].forEach((path) => revalidatePath(path))
}

function parseBillingCycle(value: FormDataEntryValue | null) {
    return value === BillingCycle.YEARLY ? BillingCycle.YEARLY : BillingCycle.MONTHLY
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
    if (!value) {
        return undefined
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

function parseAssetType(value: FormDataEntryValue | null) {
    const type = String(value ?? AssetType.OTHER)
    return Object.values(AssetType).includes(type as AssetType) ? (type as AssetType) : AssetType.OTHER
}

function parseDebtType(value: FormDataEntryValue | null) {
    const type = String(value ?? DebtType.MANUAL)
    return Object.values(DebtType).includes(type as DebtType) ? (type as DebtType) : DebtType.MANUAL
}

async function refreshFinanceState(userId: string) {
    const summary = await getMonthlyBudgetSummary(userId)
    await syncBudgetAlerts(userId, summary)
}

export async function addAsset(formData: FormData) {
    const user = await requireCurrentUser()

    const amount = Number(formData.get('amount'))

    await prisma.asset.create({
        data: {
            name: String(formData.get('name') ?? ''),
            type: parseAssetType(formData.get('type')),
            amount,
            currency: String(formData.get('currency') ?? 'TRY'),
            userId: user.id,
        },
    })

    revalidateFinancePaths(['/assets'])
}

export async function addDebt(formData: FormData) {
    const user = await requireCurrentUser()

    await prisma.debt.create({
        data: {
            userId: user.id,
            name: String(formData.get('name') ?? ''),
            type: parseDebtType(formData.get('type')),
            totalBalance: Number(formData.get('totalBalance')),
            remainingBalance: Number(formData.get('remainingBalance')),
            interestRate: Number(formData.get('interestRate') ?? 0),
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths(['/debts'])
}

export async function addTransaction(data: {
    amount: number
    type: 'INCOME' | 'EXPENSE'
    category: string
    description?: string
}) {
    const user = await requireCurrentUser()

    await prisma.transaction.create({
        data: {
            userId: user.id,
            amount: data.amount,
            type: data.type,
            category: data.category,
            description: data.description,
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function enrichSubscriptionDraft(name: string) {
    return enrichSubscriptionName(name)
}

export async function createSubscriptionDraft(formData: FormData) {
    const user = await requireCurrentUser()

    const name = String(formData.get('name') ?? '').trim()
    const amount = Number(formData.get('amount'))
    const currency = String(formData.get('currency') ?? 'TRY')
    const billingCycle = parseBillingCycle(formData.get('billingCycle'))
    const category = String(formData.get('category') ?? '')
    const nextPaymentInput = String(formData.get('nextPayment') ?? '')
    const nextPayment = nextPaymentInput ? new Date(nextPaymentInput) : new Date()
    const enrichment = enrichSubscriptionName(name)

    await prisma.subscription.create({
        data: {
            userId: user.id,
            name,
            amount,
            currency,
            billingCycle,
            category: category || enrichment.category,
            nextPayment,
            isActive: true,
            brandKey: enrichment.brandKey,
            providerDomain: enrichment.providerDomain,
            logoUrl: enrichment.logoUrl,
            color: enrichment.color,
            billingAnchorDay: nextPayment.getDate(),
            autopay: formData.get('autopay') === 'on',
            status: RecordStatus.ACTIVE,
            notes: String(formData.get('notes') ?? '') || null,
            lastAmount: amount,
            monthlyNormalizedAmount: normalizeMonthlyAmount(amount, billingCycle),
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function addSubscription(formData: FormData) {
    return createSubscriptionDraft(formData)
}

export async function deleteSubscription(id: string) {
    const user = await requireCurrentUser()

    await prisma.subscription.deleteMany({
        where: { id, userId: user.id },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function createRecurringExpense(formData: FormData) {
    const user = await requireCurrentUser()
    const nextPayment = new Date(String(formData.get('nextPayment') ?? new Date().toISOString()))

    await prisma.recurringExpense.create({
        data: {
            userId: user.id,
            name: String(formData.get('name') ?? ''),
            category: String(formData.get('category') ?? 'Genel'),
            amount: Number(formData.get('amount')),
            currency: String(formData.get('currency') ?? 'TRY'),
            billingCycle: parseBillingCycle(formData.get('billingCycle')),
            billingAnchorDay: nextPayment.getDate(),
            nextPayment,
            autopay: formData.get('autopay') === 'on',
            isEssential: formData.get('isEssential') === 'on',
            notes: String(formData.get('notes') ?? '') || null,
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function deleteRecurringExpense(id: string) {
    const user = await requireCurrentUser()

    await prisma.recurringExpense.deleteMany({
        where: { id, userId: user.id },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function createIncomeSource(formData: FormData) {
    const user = await requireCurrentUser()

    await prisma.incomeSource.create({
        data: {
            userId: user.id,
            name: String(formData.get('name') ?? ''),
            amount: Number(formData.get('amount')),
            currency: String(formData.get('currency') ?? 'TRY'),
            billingCycle: parseBillingCycle(formData.get('billingCycle')),
            payday: parseOptionalNumber(formData.get('payday')) ?? null,
            isPrimary: formData.get('isPrimary') === 'on',
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function deleteIncomeSource(id: string) {
    const user = await requireCurrentUser()

    await prisma.incomeSource.deleteMany({
        where: { id, userId: user.id },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function updateBudgetMonth(formData: FormData) {
    const user = await requireCurrentUser()
    const month = startOfMonth(new Date(String(formData.get('month') ?? new Date().toISOString())))

    await prisma.budgetMonth.upsert({
        where: {
            userId_month: {
                userId: user.id,
                month,
            },
        },
        create: {
            userId: user.id,
            month,
            plannedIncome: Number(formData.get('plannedIncome') ?? 0),
            fixedCommitments: Number(formData.get('fixedCommitments') ?? 0),
            debtCommitments: Number(formData.get('debtCommitments') ?? 0),
            freeCash: Number(formData.get('freeCash') ?? 0),
            bufferTarget: Number(formData.get('bufferTarget') ?? 0),
            notes: String(formData.get('notes') ?? '') || null,
        },
        update: {
            plannedIncome: Number(formData.get('plannedIncome') ?? 0),
            fixedCommitments: Number(formData.get('fixedCommitments') ?? 0),
            debtCommitments: Number(formData.get('debtCommitments') ?? 0),
            freeCash: Number(formData.get('freeCash') ?? 0),
            bufferTarget: Number(formData.get('bufferTarget') ?? 0),
            notes: String(formData.get('notes') ?? '') || null,
        },
    })

    await refreshFinanceState(user.id)
    revalidateFinancePaths()
}

export async function dismissBudgetAlert(id: string) {
    const user = await requireCurrentUser()

    await prisma.budgetAlert.updateMany({
        where: { id, userId: user.id },
        data: {
            state: BudgetAlertState.DISMISSED,
            dismissedAt: new Date(),
        },
    })

    revalidateFinancePaths()
}

export async function markInsightAsRead(id: string) {
    const user = await requireCurrentUser()

    await prisma.aIInsight.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true },
    })

    revalidatePath('/')
}
