'use server'

import { AccountType, DebtSourceType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
    createAccount,
    updateAccount,
    deleteAccount,
    adjustBalance,
    transferBetweenAccounts,
} from '@/lib/account-service'
import {
    ActionError,
    type ActionResult,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toNumberOrZero,
    toOptionalNumber,
    toOptionalString,
    toRequiredNumber,
    toRequiredString,
} from '@/lib/action-result'
import { deleteCanonicalDebtForSource, rebuildCanonicalDebtForAccount } from '@/lib/canonical-debt-service'
import { requireCurrentUser } from '@/lib/server-auth'

type AccountField =
    | 'name'
    | 'type'
    | 'balance'
    | 'currency'
    | 'bankName'
    | 'iban'
    | 'hasKmh'
    | 'kmhLimit'
    | 'kmhInterestRate'
    | 'kmhLateInterestRate'
    | 'kmhCutOffDay'
    | 'kmhPaymentDueDay'
    | 'kmhStatementDate'
    | 'kmhStatementPrincipal'
    | 'kmhStatementInterest'
    | 'kmhMinimumPayment'
    | 'kmhNextCutOffDate'
    | 'kmhNextPaymentDate'
    | 'notes'
    | 'newBalance'
    | 'fromAccountId'
    | 'toAccountId'
    | 'amount'

function revalidateAccountPaths() {
    ;['/', '/accounts', '/debts', '/budget', '/analytics'].forEach((p) => revalidatePath(p))
}

function parseAccountType(value: FormDataEntryValue | null): AccountType {
    const type = String(value ?? 'BANK_ACCOUNT')
    return Object.values(AccountType).includes(type as AccountType)
        ? (type as AccountType)
        : AccountType.BANK_ACCOUNT
}

const DAY_OPTIONS = { min: 1, max: 31, integer: true } as const
const NON_NEGATIVE_OPTIONS = { min: 0 } as const
const RATE_PERCENT_OPTIONS = { min: 0, max: 100 } as const

function toOptionalDate(value: FormDataEntryValue | null, field: AccountField, label: string) {
    const raw = String(value ?? '').trim()
    if (!raw) return null

    const date = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(date.getTime())) {
        throw new ActionError(`${label} gecersiz.`, { [field]: `${label} gecersiz.` })
    }

    return date
}

export async function createAccountAction(formData: FormData) {
    return createAccountActionState(formData)
}

export async function createAccountActionState(
    previousState: ActionResult<AccountField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AccountField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()

        const account = await createAccount(user.id, {
            name: toRequiredString(data.get('name'), 'name', 'Hesap adi'),
            type: parseAccountType(data.get('type')),
            balance: toNumberOrZero(data.get('balance'), 'balance', 'Bakiye'),
            currency: String(data.get('currency') ?? 'TRY'),
            bankName: toOptionalString(data.get('bankName')),
            iban: toOptionalString(data.get('iban')),
            hasKmh: data.get('hasKmh') === 'on',
            kmhLimit: toOptionalNumber(data.get('kmhLimit'), 'kmhLimit', 'KMH limiti', NON_NEGATIVE_OPTIONS) ?? null,
            kmhInterestRate: toOptionalNumber(data.get('kmhInterestRate'), 'kmhInterestRate', 'KMH faiz orani', RATE_PERCENT_OPTIONS) ?? null,
            kmhLateInterestRate: toOptionalNumber(data.get('kmhLateInterestRate'), 'kmhLateInterestRate', 'KMH gecikme faiz orani', RATE_PERCENT_OPTIONS) ?? null,
            kmhCutOffDay: toOptionalNumber(data.get('kmhCutOffDay'), 'kmhCutOffDay', 'KMH hesap kesim gunu', DAY_OPTIONS) ?? null,
            kmhPaymentDueDay: toOptionalNumber(data.get('kmhPaymentDueDay'), 'kmhPaymentDueDay', 'KMH son odeme gunu', DAY_OPTIONS) ?? null,
            kmhStatementDate: toOptionalDate(data.get('kmhStatementDate'), 'kmhStatementDate', 'KMH hesap kesim tarihi'),
            kmhStatementPrincipal: toOptionalNumber(data.get('kmhStatementPrincipal'), 'kmhStatementPrincipal', 'KMH anapara borcu', NON_NEGATIVE_OPTIONS) ?? null,
            kmhStatementInterest: toOptionalNumber(data.get('kmhStatementInterest'), 'kmhStatementInterest', 'KMH donem faizi', NON_NEGATIVE_OPTIONS) ?? null,
            kmhMinimumPayment: toOptionalNumber(data.get('kmhMinimumPayment'), 'kmhMinimumPayment', 'KMH asgari odeme', NON_NEGATIVE_OPTIONS) ?? null,
            kmhNextCutOffDate: toOptionalDate(data.get('kmhNextCutOffDate'), 'kmhNextCutOffDate', 'Sonraki hesap kesim tarihi'),
            kmhNextPaymentDate: toOptionalDate(data.get('kmhNextPaymentDate'), 'kmhNextPaymentDate', 'KMH son odeme tarihi'),
            isDefault: data.get('isDefault') === 'on',
            notes: toOptionalString(data.get('notes')),
        })

        await rebuildCanonicalDebtForAccount(user.id, account.id)
        revalidateAccountPaths()
        return createSuccessResult('Hesap kaydedildi.', account.id)
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Hesap kaydedilemedi.')
    }
}

export async function updateAccountAction(
    previousState: ActionResult<AccountField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AccountField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const accountId = String(data.get('accountId'))

        const account = await updateAccount(accountId, user.id, {
            name: toRequiredString(data.get('name'), 'name', 'Hesap adi'),
            type: parseAccountType(data.get('type')),
            bankName: toOptionalString(data.get('bankName')) ?? null,
            iban: toOptionalString(data.get('iban')) ?? null,
            hasKmh: data.get('hasKmh') === 'on',
            kmhLimit: toOptionalNumber(data.get('kmhLimit'), 'kmhLimit', 'KMH limiti', NON_NEGATIVE_OPTIONS) ?? null,
            kmhInterestRate: toOptionalNumber(data.get('kmhInterestRate'), 'kmhInterestRate', 'KMH faiz orani', RATE_PERCENT_OPTIONS) ?? null,
            kmhLateInterestRate: toOptionalNumber(data.get('kmhLateInterestRate'), 'kmhLateInterestRate', 'KMH gecikme faiz orani', RATE_PERCENT_OPTIONS) ?? null,
            kmhCutOffDay: toOptionalNumber(data.get('kmhCutOffDay'), 'kmhCutOffDay', 'KMH hesap kesim gunu', DAY_OPTIONS) ?? null,
            kmhPaymentDueDay: toOptionalNumber(data.get('kmhPaymentDueDay'), 'kmhPaymentDueDay', 'KMH son odeme gunu', DAY_OPTIONS) ?? null,
            kmhStatementDate: toOptionalDate(data.get('kmhStatementDate'), 'kmhStatementDate', 'KMH hesap kesim tarihi'),
            kmhStatementPrincipal: toOptionalNumber(data.get('kmhStatementPrincipal'), 'kmhStatementPrincipal', 'KMH anapara borcu', NON_NEGATIVE_OPTIONS) ?? null,
            kmhStatementInterest: toOptionalNumber(data.get('kmhStatementInterest'), 'kmhStatementInterest', 'KMH donem faizi', NON_NEGATIVE_OPTIONS) ?? null,
            kmhMinimumPayment: toOptionalNumber(data.get('kmhMinimumPayment'), 'kmhMinimumPayment', 'KMH asgari odeme', NON_NEGATIVE_OPTIONS) ?? null,
            kmhNextCutOffDate: toOptionalDate(data.get('kmhNextCutOffDate'), 'kmhNextCutOffDate', 'Sonraki hesap kesim tarihi'),
            kmhNextPaymentDate: toOptionalDate(data.get('kmhNextPaymentDate'), 'kmhNextPaymentDate', 'KMH son odeme tarihi'),
            isDefault: data.get('isDefault') === 'on',
            notes: toOptionalString(data.get('notes')) ?? null,
        })

        await rebuildCanonicalDebtForAccount(user.id, account.id)
        revalidateAccountPaths()
        return createSuccessResult('Hesap guncellendi.', account.id)
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Hesap guncellenemedi.')
    }
}

export async function deleteAccountAction(accountId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await deleteCanonicalDebtForSource(user.id, DebtSourceType.KMH, accountId)
        await deleteAccount(accountId, user.id)
        revalidateAccountPaths()
        return createSuccessResult('Hesap silindi.', accountId)
    } catch (error) {
        return getActionErrorResult(error, 'Hesap silinemedi.')
    }
}

export async function adjustBalanceAction(
    previousState: ActionResult<AccountField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AccountField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const accountId = String(data.get('accountId'))
        const newBalance = toNumberOrZero(data.get('newBalance'), 'newBalance', 'Yeni bakiye')
        const description = toOptionalString(data.get('description'))

        await adjustBalance(accountId, user.id, newBalance, description)
        await rebuildCanonicalDebtForAccount(user.id, accountId)
        revalidateAccountPaths()
        return createSuccessResult('Bakiye guncellendi.', accountId)
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Bakiye guncellenemedi.')
    }
}

export async function transferAction(
    previousState: ActionResult<AccountField> | FormData,
    formData?: FormData,
): Promise<ActionResult<AccountField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const fromAccountId = String(data.get('fromAccountId'))
        const toAccountId = String(data.get('toAccountId'))
        const amount = toRequiredNumber(data.get('amount'), 'amount', 'Transfer tutari', { min: 0.01 })
        const description = toOptionalString(data.get('description'))

        await transferBetweenAccounts(user.id, fromAccountId, toAccountId, amount, description)
        await Promise.all([
            rebuildCanonicalDebtForAccount(user.id, fromAccountId),
            rebuildCanonicalDebtForAccount(user.id, toAccountId),
        ])
        revalidateAccountPaths()
        return createSuccessResult('Transfer kaydedildi.')
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Transfer kaydedilemedi.')
    }
}
