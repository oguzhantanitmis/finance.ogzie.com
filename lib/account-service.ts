'use server'

import { AccountType, type Account } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ============================================================
// CRUD İşlemleri
// ============================================================

export async function getAccounts(userId: string): Promise<Account[]> {
    return prisma.account.findMany({
        where: { userId, isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
}

export async function getDefaultAccount(userId: string): Promise<Account | null> {
    return prisma.account.findFirst({
        where: { userId, isDefault: true, isActive: true },
    })
}

export async function createAccount(
    userId: string,
    data: {
        name: string
        type: AccountType
        balance?: number
        currency?: string
        bankName?: string
        iban?: string
        isDefault?: boolean
        notes?: string
    }
): Promise<Account> {
    // Eğer isDefault true ise, diğer hesapların isDefault'unu kaldır
    if (data.isDefault) {
        await prisma.account.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        })
    }

    return prisma.account.create({
        data: {
            userId,
            name: data.name,
            type: data.type,
            balance: data.balance ?? 0,
            currency: data.currency ?? 'TRY',
            bankName: data.bankName ?? null,
            iban: data.iban ?? null,
            isDefault: data.isDefault ?? false,
            notes: data.notes ?? null,
        },
    })
}

export async function updateAccount(
    accountId: string,
    userId: string,
    data: {
        name?: string
        type?: AccountType
        bankName?: string | null
        iban?: string | null
        isDefault?: boolean
        notes?: string | null
    }
): Promise<Account> {
    if (data.isDefault) {
        await prisma.account.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        })
    }

    return prisma.account.update({
        where: { id: accountId },
        data,
    })
}

export async function deleteAccount(accountId: string, userId: string): Promise<void> {
    await prisma.account.update({
        where: { id: accountId },
        data: { isActive: false },
    })
}

// ============================================================
// Bakiye İşlemleri
// ============================================================

export async function adjustBalance(
    accountId: string,
    userId: string,
    newBalance: number,
    description?: string
): Promise<Account> {
    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } })
    const difference = newBalance - account.balance

    const [updatedAccount] = await prisma.$transaction([
        prisma.account.update({
            where: { id: accountId },
            data: { balance: newBalance },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'BALANCE_ADJUSTMENT',
                amount: difference,
                currency: account.currency,
                description: description || `Bakiye düzeltme: ${account.balance.toFixed(2)} → ${newBalance.toFixed(2)}`,
                accountId,
                date: new Date(),
            },
        }),
    ])

    return updatedAccount
}

export async function transferBetweenAccounts(
    userId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description?: string
): Promise<void> {
    if (fromAccountId === toAccountId) {
        throw new Error('Aynı hesaba transfer yapılamaz.')
    }
    if (amount <= 0) {
        throw new Error('Transfer tutarı sıfırdan büyük olmalıdır.')
    }

    const fromAccount = await prisma.account.findUniqueOrThrow({ where: { id: fromAccountId } })
    const toAccount = await prisma.account.findUniqueOrThrow({ where: { id: toAccountId } })

    const transferDesc = description || `Transfer: ${fromAccount.name} → ${toAccount.name}`

    await prisma.$transaction([
        // Kaynak hesap bakiyesini düşür
        prisma.account.update({
            where: { id: fromAccountId },
            data: { balance: { decrement: amount } },
        }),
        // Hedef hesap bakiyesini artır
        prisma.account.update({
            where: { id: toAccountId },
            data: { balance: { increment: amount } },
        }),
        // Çıkış LedgerEntry
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'TRANSFER',
                amount: -amount,
                currency: fromAccount.currency,
                description: transferDesc,
                accountId: fromAccountId,
                date: new Date(),
            },
        }),
        // Giriş LedgerEntry
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'TRANSFER',
                amount: amount,
                currency: toAccount.currency,
                description: transferDesc,
                accountId: toAccountId,
                date: new Date(),
            },
        }),
    ])
}

// ============================================================
// Hesaplama
// ============================================================

export async function getTotalBalance(userId: string): Promise<number> {
    const accounts = await prisma.account.findMany({
        where: { userId, isActive: true },
        select: { balance: true },
    })
    return accounts.reduce((sum, a) => sum + a.balance, 0)
}

export async function getAvailableCash(userId: string): Promise<number> {
    const accounts = await prisma.account.findMany({
        where: { userId, isActive: true, type: { in: ['BANK_ACCOUNT', 'CASH', 'WALLET'] } },
        select: { balance: true },
    })
    return accounts.reduce((sum, a) => sum + a.balance, 0)
}
