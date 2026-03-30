'use server'

import { revalidatePath } from 'next/cache'
import {
    type ActionResult,
    createSuccessResult,
    getActionErrorResult,
} from '@/lib/action-result'
import {
    recordIncome,
    recordExpense,
    recordSubscriptionPayment,
    recordRecurringPayment,
} from '@/lib/ledger-service'
import { requireCurrentUser } from '@/lib/server-auth'

type TransactionField = 'amount' | 'accountId' | 'description' | 'category'

function revalidateFinancePaths() {
    const paths = ['/', '/transactions', '/accounts', '/budget']
    paths.forEach((p) => revalidatePath(p))
}

export async function addIncomeAction(data: {
    amount: number
    accountId: string
    description: string
    category?: string
    date?: string
}): Promise<ActionResult<TransactionField>> {
    try {
        const user = await requireCurrentUser()

        if (!data.amount || data.amount <= 0) {
            return { success: false, message: 'Tutar sıfırdan büyük olmalıdır.', fieldErrors: { amount: 'Tutar geçersiz.' } }
        }
        if (!data.accountId) {
            return { success: false, message: 'Hesap seçilmelidir.', fieldErrors: { accountId: 'Hesap zorunlu.' } }
        }
        if (!data.description?.trim()) {
            return { success: false, message: 'Açıklama zorunludur.', fieldErrors: { description: 'Açıklama zorunlu.' } }
        }

        await recordIncome(user.id, {
            amount: data.amount,
            accountId: data.accountId,
            description: data.description.trim(),
            category: data.category || undefined,
            date: data.date ? new Date(data.date) : undefined,
        })

        revalidateFinancePaths()
        return createSuccessResult('Gelir kaydedildi.')
    } catch (error) {
        return getActionErrorResult<TransactionField>(error, 'Gelir kaydedilemedi.')
    }
}

export async function addExpenseAction(data: {
    amount: number
    accountId: string
    description: string
    category?: string
    date?: string
}): Promise<ActionResult<TransactionField>> {
    try {
        const user = await requireCurrentUser()

        if (!data.amount || data.amount <= 0) {
            return { success: false, message: 'Tutar sıfırdan büyük olmalıdır.', fieldErrors: { amount: 'Tutar geçersiz.' } }
        }
        if (!data.accountId) {
            return { success: false, message: 'Hesap seçilmelidir.', fieldErrors: { accountId: 'Hesap zorunlu.' } }
        }
        if (!data.description?.trim()) {
            return { success: false, message: 'Açıklama zorunludur.', fieldErrors: { description: 'Açıklama zorunlu.' } }
        }

        await recordExpense(user.id, {
            amount: data.amount,
            accountId: data.accountId,
            description: data.description.trim(),
            category: data.category || undefined,
            date: data.date ? new Date(data.date) : undefined,
        })

        revalidateFinancePaths()
        return createSuccessResult('Gider kaydedildi.')
    } catch (error) {
        return getActionErrorResult<TransactionField>(error, 'Gider kaydedilemedi.')
    }
}

export async function paySubscriptionAction(data: {
    subscriptionId: string
    accountId: string
    amount: number
}): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await recordSubscriptionPayment(user.id, {
            subscriptionId: data.subscriptionId,
            accountId: data.accountId,
            amount: data.amount,
        })

        revalidatePath('/')
        revalidatePath('/subscriptions')
        revalidatePath('/accounts')
        revalidatePath('/transactions')
        return createSuccessResult('Abonelik ödemesi kaydedildi.')
    } catch (error) {
        return getActionErrorResult(error, 'Abonelik ödemesi kaydedilemedi.')
    }
}

export async function payRecurringAction(data: {
    recurringExpenseId: string
    accountId: string
    amount: number
}): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()

        await recordRecurringPayment(user.id, {
            recurringExpenseId: data.recurringExpenseId,
            accountId: data.accountId,
            amount: data.amount,
        })

        revalidatePath('/')
        revalidatePath('/recurring')
        revalidatePath('/accounts')
        revalidatePath('/transactions')
        return createSuccessResult('Sabit gider ödemesi kaydedildi.')
    } catch (error) {
        return getActionErrorResult(error, 'Sabit gider ödemesi kaydedilemedi.')
    }
}
