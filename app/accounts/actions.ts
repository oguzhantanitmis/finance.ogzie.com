'use server'

import { AccountType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
    createAccount,
    updateAccount,
    deleteAccount,
    adjustBalance,
    transferBetweenAccounts,
} from '@/lib/account-service'
import {
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
    | 'kmhCutOffDay'
    | 'kmhPaymentDueDay'
    | 'notes'
    | 'newBalance'
    | 'fromAccountId'
    | 'toAccountId'
    | 'amount'

function revalidateAccountPaths() {
    ;['/', '/accounts', '/budget', '/analytics'].forEach((p) => revalidatePath(p))
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
            kmhCutOffDay: toOptionalNumber(data.get('kmhCutOffDay'), 'kmhCutOffDay', 'KMH hesap kesim gunu', DAY_OPTIONS) ?? null,
            kmhPaymentDueDay: toOptionalNumber(data.get('kmhPaymentDueDay'), 'kmhPaymentDueDay', 'KMH son odeme gunu', DAY_OPTIONS) ?? null,
            isDefault: data.get('isDefault') === 'on',
            notes: toOptionalString(data.get('notes')),
        })

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
            kmhCutOffDay: toOptionalNumber(data.get('kmhCutOffDay'), 'kmhCutOffDay', 'KMH hesap kesim gunu', DAY_OPTIONS) ?? null,
            kmhPaymentDueDay: toOptionalNumber(data.get('kmhPaymentDueDay'), 'kmhPaymentDueDay', 'KMH son odeme gunu', DAY_OPTIONS) ?? null,
            isDefault: data.get('isDefault') === 'on',
            notes: toOptionalString(data.get('notes')) ?? null,
        })

        revalidateAccountPaths()
        return createSuccessResult('Hesap guncellendi.', account.id)
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Hesap guncellenemedi.')
    }
}

export async function deleteAccountAction(accountId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
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
        revalidateAccountPaths()
        return createSuccessResult('Transfer kaydedildi.')
    } catch (error) {
        return getActionErrorResult<AccountField>(error, 'Transfer kaydedilemedi.')
    }
}
