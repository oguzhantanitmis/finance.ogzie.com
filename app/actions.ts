'use server'

import {
    AssetType,
    BillingCycle,
    BudgetAlertState,
    DebtType,
    RecordStatus,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { addMonths, startOfMonth } from 'date-fns'

import {
    type ActionResult,
    ActionError,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalNumber,
    toOptionalString,
    toRequiredNumber,
    toRequiredString,
} from '@/lib/action-result'
import { calculateLoanSchedule } from '@/lib/banking-engine'
import { type SubscriptionEnrichment } from '@/lib/finance-os-types'
import { getMonthlyBudgetSummary, normalizeMonthlyAmount } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { syncBudgetAlerts } from '@/lib/reminder-engine'
import { requireCurrentUser } from '@/lib/server-auth'
import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

const REVALIDATE_PATHS = [
    '/',
    '/assets',
    '/debts',
    '/subscriptions',
    '/recurring',
    '/budget',
    '/analytics',
    '/payment-plan',
    '/goals',
]

type AssetField = 'name' | 'type' | 'amount' | 'currency' | 'unitPrice' | 'lastValue'
type DebtField =
    | 'name'
    | 'type'
    | 'limit'
    | 'cutOffDay'
    | 'paymentDueDay'
    | 'totalPrincipal'
    | 'installments'
    | 'remainingInstallments'
    | 'totalBalance'
    | 'remainingBalance'
    | 'interestRate'
    | 'minPaymentRate'
    | 'kkdfRate'
    | 'bsmvRate'
    | 'dueDate'
type SubscriptionField = 'name' | 'amount' | 'currency' | 'billingCycle' | 'category' | 'nextPayment' | 'notes' | 'status'
type RecurringExpenseField = SubscriptionField | 'autopay' | 'isEssential'
type IncomeSourceField = 'name' | 'amount' | 'currency' | 'billingCycle' | 'payday' | 'isPrimary' | 'status'
type BudgetField = 'month' | 'plannedIncome' | 'fixedCommitments' | 'debtCommitments' | 'freeCash' | 'bufferTarget' | 'notes'

function revalidateFinancePaths(extraPaths: string[] = []) {
    new Set([...REVALIDATE_PATHS, ...extraPaths]).forEach((path) => revalidatePath(path))
}

function parseBillingCycle(value: FormDataEntryValue | null) {
    return value === BillingCycle.YEARLY ? BillingCycle.YEARLY : BillingCycle.MONTHLY
}

function parseAssetType(value: FormDataEntryValue | null) {
    const type = String(value ?? AssetType.OTHER)
    return Object.values(AssetType).includes(type as AssetType) ? (type as AssetType) : AssetType.OTHER
}

function parseDebtType(value: FormDataEntryValue | null) {
    const type = String(value ?? DebtType.MANUAL)
    return Object.values(DebtType).includes(type as DebtType) ? (type as DebtType) : DebtType.MANUAL
}

function parseRecordStatus(value: FormDataEntryValue | null) {
    const status = String(value ?? RecordStatus.ACTIVE)
    return Object.values(RecordStatus).includes(status as RecordStatus)
        ? (status as RecordStatus)
        : RecordStatus.ACTIVE
}

function parseDateInput(value: FormDataEntryValue | null, fallback = new Date()) {
    const raw = String(value ?? '').trim()
    return raw ? new Date(raw) : fallback
}

function validateDate<TField extends string>(date: Date, field: TField, label: string) {
    if (Number.isNaN(date.getTime())) {
        throw new ActionError(`${label} gecersiz.`, { [field]: `${label} gecersiz.` } as Record<TField, string>)
    }
    return date
}

async function refreshFinanceState(userId: string) {
    const summary = await getMonthlyBudgetSummary(userId)
    await syncBudgetAlerts(userId, summary)
}

async function findUserAsset(assetId: string, userId: string) {
    return prisma.asset.findFirstOrThrow({
        where: { id: assetId, userId },
    })
}

async function findUserDebt(debtId: string, userId: string) {
    return prisma.debt.findFirstOrThrow({
        where: { id: debtId, userId },
    })
}

function buildLoanPaymentPlan(debtId: string, formData: FormData) {
    const totalPrincipal = toOptionalNumber(formData.get('totalPrincipal'))
    const installments = toOptionalNumber(formData.get('installments'))
    const interestRate = toOptionalNumber(formData.get('interestRate')) ?? 0

    if (!totalPrincipal || !installments || installments <= 0) {
        return []
    }

    const schedule = calculateLoanSchedule(totalPrincipal, interestRate, installments)
    const firstDueDate = validateDate(parseDateInput(formData.get('dueDate'), new Date()), 'dueDate', 'Vade tarihi')

    return schedule.plan.map((item, index) => ({
        debtId,
        installmentNo: item.installment,
        amount: item.principal + item.interest + item.tax,
        principalAmount: item.principal,
        interestAmount: item.interest,
        taxAmount: item.tax,
        dueDate: addMonths(firstDueDate, index),
        isPaid: false,
    }))
}

export async function addAsset(
    previousState: ActionResult<AssetField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AssetField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const asset = await prisma.asset.create({
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Varlik adi'),
                type: parseAssetType(data.get('type')),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Miktar'),
                currency: String(data.get('currency') ?? 'TRY'),
                unitPrice: toOptionalNumber(data.get('unitPrice')) ?? null,
                lastValue: toOptionalNumber(data.get('lastValue')) ?? null,
                userId: user.id,
            },
        })

        revalidateFinancePaths(['/assets'])
        return createSuccessResult('Varlik kaydedildi.', asset.id)
    } catch (error) {
        return getActionErrorResult<AssetField>(error, 'Varlik kaydedilemedi.')
    }
}

export async function updateAsset(
    previousState: ActionResult<AssetField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AssetField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const assetId = String(data.get('assetId'))
        await findUserAsset(assetId, user.id)
        const asset = await prisma.asset.update({
            where: { id: assetId },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Varlik adi'),
                type: parseAssetType(data.get('type')),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Miktar'),
                currency: String(data.get('currency') ?? 'TRY'),
                unitPrice: toOptionalNumber(data.get('unitPrice')) ?? null,
                lastValue: toOptionalNumber(data.get('lastValue')) ?? null,
            },
        })

        revalidateFinancePaths(['/assets'])
        return createSuccessResult('Varlik guncellendi.', asset.id)
    } catch (error) {
        return getActionErrorResult<AssetField>(error, 'Varlik guncellenemedi.')
    }
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await findUserAsset(assetId, user.id)
        await prisma.asset.delete({ where: { id: assetId } })
        revalidateFinancePaths(['/assets'])
        return createSuccessResult('Varlik silindi.', assetId)
    } catch (error) {
        return getActionErrorResult(error, 'Varlik silinemedi.')
    }
}

export async function addDebt(
    previousState: ActionResult<DebtField> | FormData,
    formData?: FormData,
): Promise<ActionResult<DebtField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const debtType = parseDebtType(data.get('type'))
        const dueDate = data.get('dueDate') ? validateDate(parseDateInput(data.get('dueDate')), 'dueDate', 'Vade tarihi') : undefined

        const debt = await prisma.debt.create({
            data: {
                userId: user.id,
                name: toRequiredString(data.get('name'), 'name', 'Borc adi'),
                type: debtType,
                limit: toOptionalNumber(data.get('limit')) ?? null,
                cutOffDay: toOptionalNumber(data.get('cutOffDay')) ?? null,
                paymentDueDay: toOptionalNumber(data.get('paymentDueDay')) ?? null,
                totalPrincipal: toOptionalNumber(data.get('totalPrincipal')) ?? null,
                installments: toOptionalNumber(data.get('installments')) ?? null,
                remainingInstallments: toOptionalNumber(data.get('remainingInstallments')) ?? null,
                totalBalance: toRequiredNumber(data.get('totalBalance'), 'totalBalance', 'Toplam bakiye'),
                remainingBalance: toRequiredNumber(data.get('remainingBalance'), 'remainingBalance', 'Kalan bakiye'),
                interestRate: toOptionalNumber(data.get('interestRate')) ?? 0,
                minPaymentRate: toOptionalNumber(data.get('minPaymentRate')) ?? 0.2,
                kkdfRate: toOptionalNumber(data.get('kkdfRate')) ?? 0.15,
                bsmvRate: toOptionalNumber(data.get('bsmvRate')) ?? 0.15,
                dueDate: dueDate ?? null,
            },
        })

        if (debtType === DebtType.LOAN) {
            const planRows = buildLoanPaymentPlan(debt.id, data)
            if (planRows.length > 0) {
                await prisma.paymentPlan.createMany({ data: planRows })
            }
        }

        await refreshFinanceState(user.id)
        revalidateFinancePaths(['/debts'])
        return createSuccessResult('Borc kaydedildi.', debt.id)
    } catch (error) {
        return getActionErrorResult<DebtField>(error, 'Borc kaydedilemedi.')
    }
}

export async function updateDebt(
    previousState: ActionResult<DebtField> | FormData,
    formData?: FormData,
): Promise<ActionResult<DebtField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const debtId = String(data.get('debtId'))
        await findUserDebt(debtId, user.id)
        const debtType = parseDebtType(data.get('type'))
        const dueDate = data.get('dueDate') ? validateDate(parseDateInput(data.get('dueDate')), 'dueDate', 'Vade tarihi') : null

        const debt = await prisma.debt.update({
            where: { id: debtId },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Borc adi'),
                type: debtType,
                limit: toOptionalNumber(data.get('limit')) ?? null,
                cutOffDay: toOptionalNumber(data.get('cutOffDay')) ?? null,
                paymentDueDay: toOptionalNumber(data.get('paymentDueDay')) ?? null,
                totalPrincipal: toOptionalNumber(data.get('totalPrincipal')) ?? null,
                installments: toOptionalNumber(data.get('installments')) ?? null,
                remainingInstallments: toOptionalNumber(data.get('remainingInstallments')) ?? null,
                totalBalance: toRequiredNumber(data.get('totalBalance'), 'totalBalance', 'Toplam bakiye'),
                remainingBalance: toRequiredNumber(data.get('remainingBalance'), 'remainingBalance', 'Kalan bakiye'),
                interestRate: toOptionalNumber(data.get('interestRate')) ?? 0,
                minPaymentRate: toOptionalNumber(data.get('minPaymentRate')) ?? 0.2,
                kkdfRate: toOptionalNumber(data.get('kkdfRate')) ?? 0.15,
                bsmvRate: toOptionalNumber(data.get('bsmvRate')) ?? 0.15,
                dueDate,
                isPaid: (toOptionalNumber(data.get('remainingBalance')) ?? 0) <= 0,
            },
        })

        if (debtType === DebtType.LOAN) {
            await prisma.paymentPlan.deleteMany({
                where: { debtId, isPaid: false },
            })
            const planRows = buildLoanPaymentPlan(debtId, data)
            if (planRows.length > 0) {
                await prisma.paymentPlan.createMany({ data: planRows })
            }
        }

        await refreshFinanceState(user.id)
        revalidateFinancePaths(['/debts'])
        return createSuccessResult('Borc guncellendi.', debt.id)
    } catch (error) {
        return getActionErrorResult<DebtField>(error, 'Borc guncellenemedi.')
    }
}

export async function deleteDebt(debtId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await findUserDebt(debtId, user.id)
        await prisma.debt.delete({ where: { id: debtId } })
        await refreshFinanceState(user.id)
        revalidateFinancePaths(['/debts'])
        return createSuccessResult('Borc silindi.', debtId)
    } catch (error) {
        return getActionErrorResult(error, 'Borc silinemedi.')
    }
}

export async function addTransaction(data: {
    amount: number
    type: 'INCOME' | 'EXPENSE'
    category: string
    description?: string
}) {
    try {
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
        revalidateFinancePaths(['/transactions'])
        return createSuccessResult('Islem kaydedildi.')
    } catch (error) {
        return getActionErrorResult(error, 'Islem kaydedilemedi.')
    }
}

export async function enrichSubscriptionDraft(name: string): Promise<SubscriptionEnrichment> {
    return enrichSubscriptionName(name)
}

function resolveSubscriptionName(name: string, enrichment: SubscriptionEnrichment) {
    return enrichment.shouldCanonicalizeName ? enrichment.displayName : name.trim()
}

export async function createSubscriptionDraft(
    previousState: ActionResult<SubscriptionField> | FormData,
    formData?: FormData,
): Promise<ActionResult<SubscriptionField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()

        const name = toRequiredString(data.get('name'), 'name', 'Abonelik adi')
        const amount = toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 })
        const currency = String(data.get('currency') ?? 'TRY')
        const billingCycle = parseBillingCycle(data.get('billingCycle'))
        const category = toOptionalString(data.get('category'))
        const nextPayment = validateDate(parseDateInput(data.get('nextPayment')), 'nextPayment', 'Sonraki odeme')
        const enrichment = enrichSubscriptionName(name)
        const resolvedName = resolveSubscriptionName(name, enrichment)

        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                name: resolvedName,
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
                autopay: data.get('autopay') === 'on',
                status: RecordStatus.ACTIVE,
                notes: toOptionalString(data.get('notes')) ?? null,
                lastAmount: amount,
                monthlyNormalizedAmount: normalizeMonthlyAmount(amount, billingCycle),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Abonelik kaydedildi.', subscription.id)
    } catch (error) {
        return getActionErrorResult<SubscriptionField>(error, 'Abonelik kaydedilemedi.')
    }
}

export async function addSubscription(
    previousState: ActionResult<SubscriptionField> | FormData,
    formData?: FormData,
) {
    return createSubscriptionDraft(previousState, formData)
}

export async function updateSubscription(
    previousState: ActionResult<SubscriptionField> | FormData,
    formData?: FormData,
): Promise<ActionResult<SubscriptionField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const subscriptionId = String(data.get('subscriptionId'))
        const existing = await prisma.subscription.findFirstOrThrow({
            where: { id: subscriptionId, userId: user.id },
        })

        const amount = toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 })
        const billingCycle = parseBillingCycle(data.get('billingCycle'))
        const nextPayment = validateDate(parseDateInput(data.get('nextPayment')), 'nextPayment', 'Sonraki odeme')
        const inputName = toRequiredString(data.get('name'), 'name', 'Abonelik adi')
        const enrichment = enrichSubscriptionName(inputName)
        const resolvedName = resolveSubscriptionName(inputName, enrichment)
        const status = parseRecordStatus(data.get('status'))

        const subscription = await prisma.subscription.update({
            where: { id: existing.id },
            data: {
                name: resolvedName,
                amount,
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle,
                category: toOptionalString(data.get('category')) ?? enrichment.category,
                nextPayment,
                brandKey: enrichment.brandKey ?? null,
                providerDomain: enrichment.providerDomain ?? null,
                logoUrl: enrichment.logoUrl ?? null,
                color: enrichment.color,
                billingAnchorDay: nextPayment.getDate(),
                autopay: data.get('autopay') === 'on',
                notes: toOptionalString(data.get('notes')) ?? null,
                status,
                isActive: status !== RecordStatus.CANCELED,
                lastAmount: amount,
                monthlyNormalizedAmount: normalizeMonthlyAmount(amount, billingCycle),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Abonelik guncellendi.', subscription.id)
    } catch (error) {
        return getActionErrorResult<SubscriptionField>(error, 'Abonelik guncellenemedi.')
    }
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await prisma.subscription.deleteMany({
            where: { id, userId: user.id },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Abonelik silindi.', id)
    } catch (error) {
        return getActionErrorResult(error, 'Abonelik silinemedi.')
    }
}

export async function createRecurringExpense(
    previousState: ActionResult<RecurringExpenseField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RecurringExpenseField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const nextPayment = validateDate(parseDateInput(data.get('nextPayment')), 'nextPayment', 'Sonraki odeme')

        const expense = await prisma.recurringExpense.create({
            data: {
                userId: user.id,
                name: toRequiredString(data.get('name'), 'name', 'Sabit gider adi'),
                category: toRequiredString(data.get('category'), 'category', 'Kategori'),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle: parseBillingCycle(data.get('billingCycle')),
                billingAnchorDay: nextPayment.getDate(),
                nextPayment,
                autopay: data.get('autopay') === 'on',
                isEssential: data.get('isEssential') === 'on',
                notes: toOptionalString(data.get('notes')) ?? null,
                status: parseRecordStatus(data.get('status')),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Sabit gider kaydedildi.', expense.id)
    } catch (error) {
        return getActionErrorResult<RecurringExpenseField>(error, 'Sabit gider kaydedilemedi.')
    }
}

export async function updateRecurringExpense(
    previousState: ActionResult<RecurringExpenseField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RecurringExpenseField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const expenseId = String(data.get('expenseId'))
        await prisma.recurringExpense.findFirstOrThrow({
            where: { id: expenseId, userId: user.id },
            select: { id: true },
        })
        const nextPayment = validateDate(parseDateInput(data.get('nextPayment')), 'nextPayment', 'Sonraki odeme')

        const expense = await prisma.recurringExpense.update({
            where: { id: expenseId },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Sabit gider adi'),
                category: toRequiredString(data.get('category'), 'category', 'Kategori'),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle: parseBillingCycle(data.get('billingCycle')),
                billingAnchorDay: nextPayment.getDate(),
                nextPayment,
                autopay: data.get('autopay') === 'on',
                isEssential: data.get('isEssential') === 'on',
                notes: toOptionalString(data.get('notes')) ?? null,
                status: parseRecordStatus(data.get('status')),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Sabit gider guncellendi.', expense.id)
    } catch (error) {
        return getActionErrorResult<RecurringExpenseField>(error, 'Sabit gider guncellenemedi.')
    }
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await prisma.recurringExpense.deleteMany({
            where: { id, userId: user.id },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Sabit gider silindi.', id)
    } catch (error) {
        return getActionErrorResult(error, 'Sabit gider silinemedi.')
    }
}

export async function createIncomeSource(
    previousState: ActionResult<IncomeSourceField> | FormData,
    formData?: FormData,
): Promise<ActionResult<IncomeSourceField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()

        const income = await prisma.incomeSource.create({
            data: {
                userId: user.id,
                name: toRequiredString(data.get('name'), 'name', 'Gelir adi'),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle: parseBillingCycle(data.get('billingCycle')),
                payday: toOptionalNumber(data.get('payday')) ?? null,
                isPrimary: data.get('isPrimary') === 'on',
                status: parseRecordStatus(data.get('status')),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Gelir kaydedildi.', income.id)
    } catch (error) {
        return getActionErrorResult<IncomeSourceField>(error, 'Gelir kaydedilemedi.')
    }
}

export async function updateIncomeSource(
    previousState: ActionResult<IncomeSourceField> | FormData,
    formData?: FormData,
): Promise<ActionResult<IncomeSourceField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const incomeId = String(data.get('incomeId'))
        await prisma.incomeSource.findFirstOrThrow({
            where: { id: incomeId, userId: user.id },
            select: { id: true },
        })

        const income = await prisma.incomeSource.update({
            where: { id: incomeId },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Gelir adi'),
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle: parseBillingCycle(data.get('billingCycle')),
                payday: toOptionalNumber(data.get('payday')) ?? null,
                isPrimary: data.get('isPrimary') === 'on',
                status: parseRecordStatus(data.get('status')),
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Gelir guncellendi.', income.id)
    } catch (error) {
        return getActionErrorResult<IncomeSourceField>(error, 'Gelir guncellenemedi.')
    }
}

export async function deleteIncomeSource(id: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await prisma.incomeSource.deleteMany({
            where: { id, userId: user.id },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Gelir kaydi silindi.', id)
    } catch (error) {
        return getActionErrorResult(error, 'Gelir kaydi silinemedi.')
    }
}

export async function updateBudgetMonth(
    previousState: ActionResult<BudgetField> | FormData,
    formData?: FormData,
): Promise<ActionResult<BudgetField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const month = startOfMonth(validateDate(parseDateInput(data.get('month')), 'month', 'Ay'))

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
                plannedIncome: Number(data.get('plannedIncome') ?? 0),
                fixedCommitments: Number(data.get('fixedCommitments') ?? 0),
                debtCommitments: Number(data.get('debtCommitments') ?? 0),
                freeCash: Number(data.get('freeCash') ?? 0),
                bufferTarget: Number(data.get('bufferTarget') ?? 0),
                notes: toOptionalString(data.get('notes')) ?? null,
            },
            update: {
                plannedIncome: Number(data.get('plannedIncome') ?? 0),
                fixedCommitments: Number(data.get('fixedCommitments') ?? 0),
                debtCommitments: Number(data.get('debtCommitments') ?? 0),
                freeCash: Number(data.get('freeCash') ?? 0),
                bufferTarget: Number(data.get('bufferTarget') ?? 0),
                notes: toOptionalString(data.get('notes')) ?? null,
            },
        })

        await refreshFinanceState(user.id)
        revalidateFinancePaths()
        return createSuccessResult('Butce guncellendi.', month.toISOString())
    } catch (error) {
        return getActionErrorResult<BudgetField>(error, 'Butce guncellenemedi.')
    }
}

export async function dismissBudgetAlert(id: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await prisma.budgetAlert.updateMany({
            where: { id, userId: user.id },
            data: {
                state: BudgetAlertState.DISMISSED,
                dismissedAt: new Date(),
            },
        })

        revalidateFinancePaths()
        return createSuccessResult('Uyari kapatildi.', id)
    } catch (error) {
        return getActionErrorResult(error, 'Uyari kapatilamadi.')
    }
}

export async function markInsightAsRead(id: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await prisma.aIInsight.updateMany({
            where: { id, userId: user.id },
            data: { isRead: true },
        })

        revalidatePath('/')
        return createSuccessResult('Icgoru kapatildi.', id)
    } catch (error) {
        return getActionErrorResult(error, 'Icgoru kapatilamadi.')
    }
}
