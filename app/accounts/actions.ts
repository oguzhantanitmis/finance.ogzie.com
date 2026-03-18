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
import { requireCurrentUser } from '@/lib/server-auth'

function revalidateAccountPaths() {
    ;['/', '/accounts', '/budget', '/analytics'].forEach((p) => revalidatePath(p))
}

function parseAccountType(value: FormDataEntryValue | null): AccountType {
    const type = String(value ?? 'BANK_ACCOUNT')
    return Object.values(AccountType).includes(type as AccountType)
        ? (type as AccountType)
        : AccountType.BANK_ACCOUNT
}

export async function createAccountAction(formData: FormData) {
    const user = await requireCurrentUser()

    await createAccount(user.id, {
        name: String(formData.get('name') ?? '').trim(),
        type: parseAccountType(formData.get('type')),
        balance: Number(formData.get('balance') ?? 0),
        currency: String(formData.get('currency') ?? 'TRY'),
        bankName: String(formData.get('bankName') ?? '') || undefined,
        iban: String(formData.get('iban') ?? '') || undefined,
        isDefault: formData.get('isDefault') === 'on',
        notes: String(formData.get('notes') ?? '') || undefined,
    })

    revalidateAccountPaths()
}

export async function updateAccountAction(formData: FormData) {
    const user = await requireCurrentUser()
    const accountId = String(formData.get('accountId'))

    await updateAccount(accountId, user.id, {
        name: String(formData.get('name') ?? '').trim(),
        type: parseAccountType(formData.get('type')),
        bankName: String(formData.get('bankName') ?? '') || null,
        iban: String(formData.get('iban') ?? '') || null,
        isDefault: formData.get('isDefault') === 'on',
        notes: String(formData.get('notes') ?? '') || null,
    })

    revalidateAccountPaths()
}

export async function deleteAccountAction(accountId: string) {
    const user = await requireCurrentUser()
    await deleteAccount(accountId, user.id)
    revalidateAccountPaths()
}

export async function adjustBalanceAction(formData: FormData) {
    const user = await requireCurrentUser()
    const accountId = String(formData.get('accountId'))
    const newBalance = Number(formData.get('newBalance') ?? 0)
    const description = String(formData.get('description') ?? '') || undefined

    await adjustBalance(accountId, user.id, newBalance, description)
    revalidateAccountPaths()
}

export async function transferAction(formData: FormData) {
    const user = await requireCurrentUser()
    const fromAccountId = String(formData.get('fromAccountId'))
    const toAccountId = String(formData.get('toAccountId'))
    const amount = Number(formData.get('amount') ?? 0)
    const description = String(formData.get('description') ?? '') || undefined

    await transferBetweenAccounts(user.id, fromAccountId, toAccountId, amount, description)
    revalidateAccountPaths()
}
