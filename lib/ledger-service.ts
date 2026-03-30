'use server'

import type { LedgerEntry, LedgerEntryType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface LedgerFilter {
    type?: LedgerEntryType
    accountId?: string
    startDate?: Date
    endDate?: Date
    search?: string
}

export interface LedgerEntryWithRelations extends LedgerEntry {
    account?: { name: string } | null
}

export async function getLedgerEntries(
    userId: string,
    filters?: LedgerFilter,
    limit: number = 50,
    offset: number = 0
): Promise<{ entries: LedgerEntryWithRelations[]; total: number }> {
    const where: Record<string, unknown> = { userId }

    if (filters?.type) where.type = filters.type
    if (filters?.accountId) where.accountId = filters.accountId
    if (filters?.startDate || filters?.endDate) {
        where.date = {}
        if (filters.startDate) (where.date as Record<string, Date>).gte = filters.startDate
        if (filters.endDate) (where.date as Record<string, Date>).lte = filters.endDate
    }
    if (filters?.search) {
        where.description = { contains: filters.search }
    }

    const [entries, total] = await Promise.all([
        prisma.ledgerEntry.findMany({
            where,
            include: { account: { select: { name: true } } },
            orderBy: { date: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.ledgerEntry.count({ where }),
    ])

    return { entries, total }
}

// ============================================================
// Atomik Kayıt Fonksiyonları
// ============================================================

/**
 * Manuel gelir kaydı.
 * 1. Account.balance += amount
 * 2. LedgerEntry(INCOME) oluştur
 * Tüm işlemler atomic ($transaction).
 */
export async function recordIncome(
    userId: string,
    data: {
        amount: number
        accountId: string
        description: string
        category?: string
        date?: Date
    }
): Promise<LedgerEntry> {
    if (data.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const account = await prisma.account.findFirstOrThrow({
        where: { id: data.accountId, userId },
    })

    const [, entry] = await prisma.$transaction([
        prisma.account.update({
            where: { id: account.id },
            data: { balance: { increment: data.amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'INCOME',
                amount: data.amount,
                currency: account.currency,
                description: data.description,
                category: data.category ?? 'Gelir',
                accountId: account.id,
                date: data.date ?? new Date(),
            },
        }),
    ])

    return entry
}

/**
 * Manuel gider kaydı.
 * 1. Account.balance -= amount
 * 2. LedgerEntry(EXPENSE) oluştur
 * Tüm işlemler atomic ($transaction).
 */
export async function recordExpense(
    userId: string,
    data: {
        amount: number
        accountId: string
        description: string
        category?: string
        date?: Date
    }
): Promise<LedgerEntry> {
    if (data.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const account = await prisma.account.findFirstOrThrow({
        where: { id: data.accountId, userId },
    })

    const [, entry] = await prisma.$transaction([
        prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: data.amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'EXPENSE',
                amount: -data.amount,
                currency: account.currency,
                description: data.description,
                category: data.category ?? 'Gider',
                accountId: account.id,
                date: data.date ?? new Date(),
            },
        }),
    ])

    return entry
}

/**
 * Abonelik ödeme kaydı.
 * 1. Account.balance -= amount
 * 2. LedgerEntry(SUBSCRIPTION_PAYMENT) oluştur
 * 3. Subscription.nextPayment ilerleme (opsiyonel)
 * Tüm işlemler atomic ($transaction).
 */
export async function recordSubscriptionPayment(
    userId: string,
    data: {
        subscriptionId: string
        accountId: string
        amount: number
        advanceNextPayment?: boolean
    }
): Promise<LedgerEntry> {
    if (data.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const [subscription, account] = await Promise.all([
        prisma.subscription.findFirstOrThrow({
            where: { id: data.subscriptionId, userId },
        }),
        prisma.account.findFirstOrThrow({
            where: { id: data.accountId, userId },
        }),
    ])

    const operations: Prisma.PrismaPromise<unknown>[] = [
        prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: data.amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'SUBSCRIPTION_PAYMENT',
                amount: -data.amount,
                currency: subscription.currency,
                description: `Abonelik ödeme: ${subscription.name}`,
                category: subscription.category,
                accountId: account.id,
                subscriptionId: subscription.id,
                date: new Date(),
            },
        }),
    ]

    // NextPayment ilerleme
    if (data.advanceNextPayment !== false) {
        const next = new Date(subscription.nextPayment)
        if (subscription.billingCycle === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1)
        } else {
            next.setFullYear(next.getFullYear() + 1)
        }
        operations.push(
            prisma.subscription.update({
                where: { id: subscription.id },
                data: { nextPayment: next },
            })
        )
    }

    const results = await prisma.$transaction(operations)
    return results[1] as LedgerEntry
}

/**
 * Sabit gider ödeme kaydı.
 * 1. Account.balance -= amount
 * 2. LedgerEntry(EXPENSE) oluştur
 * 3. RecurringExpense.nextPayment ilerleme
 * Tüm işlemler atomic ($transaction).
 */
export async function recordRecurringPayment(
    userId: string,
    data: {
        recurringExpenseId: string
        accountId: string
        amount: number
        advanceNextPayment?: boolean
    }
): Promise<LedgerEntry> {
    if (data.amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const [recurring, account] = await Promise.all([
        prisma.recurringExpense.findFirstOrThrow({
            where: { id: data.recurringExpenseId, userId },
        }),
        prisma.account.findFirstOrThrow({
            where: { id: data.accountId, userId },
        }),
    ])

    const operations: Prisma.PrismaPromise<unknown>[] = [
        prisma.account.update({
            where: { id: account.id },
            data: { balance: { decrement: data.amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'EXPENSE',
                amount: -data.amount,
                currency: recurring.currency,
                description: `Sabit gider: ${recurring.name}`,
                category: recurring.category,
                accountId: account.id,
                date: new Date(),
            },
        }),
    ]

    if (data.advanceNextPayment !== false) {
        const next = new Date(recurring.nextPayment)
        if (recurring.billingCycle === 'MONTHLY') {
            next.setMonth(next.getMonth() + 1)
        } else {
            next.setFullYear(next.getFullYear() + 1)
        }
        operations.push(
            prisma.recurringExpense.update({
                where: { id: recurring.id },
                data: { nextPayment: next },
            })
        )
    }

    const results = await prisma.$transaction(operations)
    return results[1] as LedgerEntry
}

export async function getLedgerSummary(userId: string) {
    const entries = await prisma.ledgerEntry.findMany({
        where: { userId },
        select: { type: true, amount: true },
    })

    let totalIncome = 0
    let totalExpense = 0
    const byType: Record<string, number> = {}

    for (const e of entries) {
        if (e.amount > 0) totalIncome += e.amount
        else totalExpense += Math.abs(e.amount)
        byType[e.type] = (byType[e.type] ?? 0) + e.amount
    }

    return { totalIncome: +totalIncome.toFixed(2), totalExpense: +totalExpense.toFixed(2), net: +(totalIncome - totalExpense).toFixed(2), byType }
}
