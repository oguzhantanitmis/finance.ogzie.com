'use server'

import type { LedgerEntry, LedgerEntryType } from '@prisma/client'
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
