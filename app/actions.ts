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
    toNumberOrZero,
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
type BudgetField =
    | 'month'
    | 'openingCash'
    | 'plannedIncome'
    | 'fixedCommitments'
    | 'debtCommitments'
    | 'plannedReceivableCollection'
    | 'savingGoal'
    | 'debtPaymentBudget'
    | 'manualAdjustment'
    | 'freeCash'
    | 'bufferTarget'
    | 'notes'

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

const DAY_OPTIONS = { min: 1, max: 31, integer: true } as const
const INSTALLMENT_OPTIONS = { min: 1, max: 600, integer: true } as const
const NON_NEGATIVE_OPTIONS = { min: 0 } as const
const RATE_PERCENT_OPTIONS = { min: 0, max: 100 } as const
const RATE_FRACTION_OPTIONS = { min: 0, max: 1 } as const

function assertRemainingNotAboveTotal<TField extends string>(
    remaining: number,
    total: number,
    field: TField,
) {
    if (remaining > total) {
        throw new ActionError('Kalan bakiye toplam bakiyeden buyuk olamaz.', {
            [field]: 'Kalan bakiye toplam bakiyeden buyuk olamaz.',
        } as Record<TField, string>)
    }
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
    const totalPrincipal = toOptionalNumber(formData.get('totalPrincipal'), 'totalPrincipal', 'Ana para', { min: 0.01 })
    const installments = toOptionalNumber(formData.get('installments'), 'installments', 'Taksit sayisi', INSTALLMENT_OPTIONS)
    const interestRate = toOptionalNumber(formData.get('interestRate'), 'interestRate', 'Faiz orani', RATE_PERCENT_OPTIONS) ?? 0

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
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Miktar', NON_NEGATIVE_OPTIONS),
                currency: String(data.get('currency') ?? 'TRY'),
                unitPrice: toOptionalNumber(data.get('unitPrice'), 'unitPrice', 'Birim fiyat', NON_NEGATIVE_OPTIONS) ?? null,
                lastValue: toOptionalNumber(data.get('lastValue'), 'lastValue', 'Son deger', NON_NEGATIVE_OPTIONS) ?? null,
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
                amount: toRequiredNumber(data.get('amount'), 'amount', 'Miktar', NON_NEGATIVE_OPTIONS),
                currency: String(data.get('currency') ?? 'TRY'),
                unitPrice: toOptionalNumber(data.get('unitPrice'), 'unitPrice', 'Birim fiyat', NON_NEGATIVE_OPTIONS) ?? null,
                lastValue: toOptionalNumber(data.get('lastValue'), 'lastValue', 'Son deger', NON_NEGATIVE_OPTIONS) ?? null,
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
        const totalBalance = toRequiredNumber(data.get('totalBalance'), 'totalBalance', 'Toplam bakiye', NON_NEGATIVE_OPTIONS)
        const remainingBalance = toRequiredNumber(data.get('remainingBalance'), 'remainingBalance', 'Kalan bakiye', NON_NEGATIVE_OPTIONS)
        assertRemainingNotAboveTotal(remainingBalance, totalBalance, 'remainingBalance')

        const debt = await prisma.debt.create({
            data: {
                userId: user.id,
                name: toRequiredString(data.get('name'), 'name', 'Borc adi'),
                type: debtType,
                limit: toOptionalNumber(data.get('limit'), 'limit', 'Limit', NON_NEGATIVE_OPTIONS) ?? null,
                cutOffDay: toOptionalNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', DAY_OPTIONS) ?? null,
                paymentDueDay: toOptionalNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', DAY_OPTIONS) ?? null,
                totalPrincipal: toOptionalNumber(data.get('totalPrincipal'), 'totalPrincipal', 'Ana para', NON_NEGATIVE_OPTIONS) ?? null,
                installments: toOptionalNumber(data.get('installments'), 'installments', 'Taksit sayisi', INSTALLMENT_OPTIONS) ?? null,
                remainingInstallments: toOptionalNumber(data.get('remainingInstallments'), 'remainingInstallments', 'Kalan taksit', INSTALLMENT_OPTIONS) ?? null,
                totalBalance,
                remainingBalance,
                interestRate: toOptionalNumber(data.get('interestRate'), 'interestRate', 'Faiz orani', RATE_PERCENT_OPTIONS) ?? 0,
                minPaymentRate: toOptionalNumber(data.get('minPaymentRate'), 'minPaymentRate', 'Asgari odeme orani', RATE_FRACTION_OPTIONS) ?? 0.2,
                kkdfRate: toOptionalNumber(data.get('kkdfRate'), 'kkdfRate', 'KKDF orani', RATE_FRACTION_OPTIONS) ?? 0.15,
                bsmvRate: toOptionalNumber(data.get('bsmvRate'), 'bsmvRate', 'BSMV orani', RATE_FRACTION_OPTIONS) ?? 0.15,
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
        const totalBalance = toRequiredNumber(data.get('totalBalance'), 'totalBalance', 'Toplam bakiye', NON_NEGATIVE_OPTIONS)
        const remainingBalance = toRequiredNumber(data.get('remainingBalance'), 'remainingBalance', 'Kalan bakiye', NON_NEGATIVE_OPTIONS)
        assertRemainingNotAboveTotal(remainingBalance, totalBalance, 'remainingBalance')

        const debt = await prisma.debt.update({
            where: { id: debtId },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Borc adi'),
                type: debtType,
                limit: toOptionalNumber(data.get('limit'), 'limit', 'Limit', NON_NEGATIVE_OPTIONS) ?? null,
                cutOffDay: toOptionalNumber(data.get('cutOffDay'), 'cutOffDay', 'Hesap kesim gunu', DAY_OPTIONS) ?? null,
                paymentDueDay: toOptionalNumber(data.get('paymentDueDay'), 'paymentDueDay', 'Son odeme gunu', DAY_OPTIONS) ?? null,
                totalPrincipal: toOptionalNumber(data.get('totalPrincipal'), 'totalPrincipal', 'Ana para', NON_NEGATIVE_OPTIONS) ?? null,
                installments: toOptionalNumber(data.get('installments'), 'installments', 'Taksit sayisi', INSTALLMENT_OPTIONS) ?? null,
                remainingInstallments: toOptionalNumber(data.get('remainingInstallments'), 'remainingInstallments', 'Kalan taksit', INSTALLMENT_OPTIONS) ?? null,
                totalBalance,
                remainingBalance,
                interestRate: toOptionalNumber(data.get('interestRate'), 'interestRate', 'Faiz orani', RATE_PERCENT_OPTIONS) ?? 0,
                minPaymentRate: toOptionalNumber(data.get('minPaymentRate'), 'minPaymentRate', 'Asgari odeme orani', RATE_FRACTION_OPTIONS) ?? 0.2,
                kkdfRate: toOptionalNumber(data.get('kkdfRate'), 'kkdfRate', 'KKDF orani', RATE_FRACTION_OPTIONS) ?? 0.15,
                bsmvRate: toOptionalNumber(data.get('bsmvRate'), 'bsmvRate', 'BSMV orani', RATE_FRACTION_OPTIONS) ?? 0.15,
                dueDate,
                isPaid: remainingBalance <= 0,
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
        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            throw new ActionError('Tutar sifirdan buyuk olmalidir.', { amount: 'Tutar gecersiz.' })
        }
        if (!['INCOME', 'EXPENSE'].includes(data.type)) {
            throw new ActionError('Islem tipi gecersiz.')
        }

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

        const subscription = await prisma.subscription.create({
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

        const subscription = await prisma.subscription.update({
            where: { id: existing.id },
            data: {
                name: toRequiredString(data.get('name'), 'name', 'Abonelik adi'),
                amount,
                currency: String(data.get('currency') ?? 'TRY'),
                billingCycle,
                category: toOptionalString(data.get('category')) ?? 'Genel',
                nextPayment,
                billingAnchorDay: nextPayment.getDate(),
                autopay: data.get('autopay') === 'on',
                notes: toOptionalString(data.get('notes')) ?? null,
                status: parseRecordStatus(data.get('status')),
                isActive: parseRecordStatus(data.get('status')) !== RecordStatus.CANCELED,
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
                payday: toOptionalNumber(data.get('payday'), 'payday', 'Odeme gunu', DAY_OPTIONS) ?? null,
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
                payday: toOptionalNumber(data.get('payday'), 'payday', 'Odeme gunu', DAY_OPTIONS) ?? null,
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
        const values = {
            openingCash: toNumberOrZero(data.get('openingCash'), 'openingCash', 'Açılış nakdi'),
            plannedIncome: toNumberOrZero(data.get('plannedIncome'), 'plannedIncome', 'Planlanan gelir'),
            fixedCommitments: toNumberOrZero(data.get('fixedCommitments'), 'fixedCommitments', 'Sabit yükler'),
            debtCommitments: toNumberOrZero(data.get('debtCommitments'), 'debtCommitments', 'Borç yükleri'),
            plannedReceivableCollection: toNumberOrZero(data.get('plannedReceivableCollection'), 'plannedReceivableCollection', 'Planlanan tahsilat'),
            savingGoal: toNumberOrZero(data.get('savingGoal'), 'savingGoal', 'Birikim hedefi'),
            debtPaymentBudget: toNumberOrZero(data.get('debtPaymentBudget'), 'debtPaymentBudget', 'Borç ödeme bütçesi'),
            manualAdjustment: toNumberOrZero(data.get('manualAdjustment'), 'manualAdjustment', 'Manuel düzeltme'),
            freeCash: toNumberOrZero(data.get('freeCash'), 'freeCash', 'Serbest nakit'),
            bufferTarget: toNumberOrZero(data.get('bufferTarget'), 'bufferTarget', 'Tampon hedef'),
            notes: toOptionalString(data.get('notes')) ?? null,
        }

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
                ...values,
            },
            update: values,
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
