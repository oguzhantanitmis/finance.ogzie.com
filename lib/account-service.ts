import { AccountType, type Account } from '@prisma/client'
import { ActionError } from '@/lib/action-result'
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

export async function getOrCreateCashAccount(userId: string): Promise<Account> {
    const existing = await prisma.account.findFirst({
        where: { userId, isActive: true, type: 'CASH' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
    if (existing) return existing

    return prisma.account.create({
        data: {
            userId,
            name: 'Nakit',
            type: 'CASH',
            balance: 0,
            currency: 'TRY',
            isDefault: false,
            isActive: true,
            notes: 'Sistem tarafından nakit işlemler için oluşturuldu.',
        },
    })
}

function assertFinite(value: number, label: string) {
    if (!Number.isFinite(value)) {
        throw new ActionError(`${label} gecersiz.`)
    }
}

function assertOptionalRange(value: number | null | undefined, label: string, min: number, max?: number) {
    if (value === null || value === undefined) return
    if (!Number.isFinite(value) || value < min || (typeof max === 'number' && value > max)) {
        throw new ActionError(`${label} gecersiz.`)
    }
}

function assertOptionalDay(value: number | null | undefined, label: string) {
    if (value === null || value === undefined) return
    if (!Number.isInteger(value) || value < 1 || value > 31) {
        throw new ActionError(`${label} 1 ile 31 arasinda olmalidir.`)
    }
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
        hasKmh?: boolean
        kmhLimit?: number | null
        kmhInterestRate?: number | null
        kmhCutOffDay?: number | null
        kmhPaymentDueDay?: number | null
        kmhStatementDate?: Date | null
        kmhStatementPrincipal?: number | null
        kmhStatementInterest?: number | null
        kmhMinimumPayment?: number | null
        kmhNextCutOffDate?: Date | null
        kmhNextPaymentDate?: Date | null
        isDefault?: boolean
        notes?: string
    }
): Promise<Account> {
    assertFinite(data.balance ?? 0, 'Bakiye')
    if (data.hasKmh) {
        assertOptionalRange(data.kmhLimit, 'KMH limiti', 0)
        assertOptionalRange(data.kmhInterestRate, 'KMH faiz orani', 0, 100)
        assertOptionalDay(data.kmhCutOffDay, 'KMH hesap kesim gunu')
        assertOptionalDay(data.kmhPaymentDueDay, 'KMH son odeme gunu')
        assertOptionalRange(data.kmhStatementPrincipal, 'KMH anapara borcu', 0)
        assertOptionalRange(data.kmhStatementInterest, 'KMH donem faizi', 0)
        assertOptionalRange(data.kmhMinimumPayment, 'KMH asgari odeme', 0)
    }

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
            hasKmh: data.hasKmh ?? false,
            kmhLimit: data.hasKmh ? (data.kmhLimit ?? null) : null,
            kmhInterestRate: data.hasKmh ? (data.kmhInterestRate ?? null) : null,
            kmhCutOffDay: data.hasKmh ? (data.kmhCutOffDay ?? null) : null,
            kmhPaymentDueDay: data.hasKmh ? (data.kmhPaymentDueDay ?? null) : null,
            kmhStatementDate: data.hasKmh ? (data.kmhStatementDate ?? null) : null,
            kmhStatementPrincipal: data.hasKmh ? (data.kmhStatementPrincipal ?? null) : null,
            kmhStatementInterest: data.hasKmh ? (data.kmhStatementInterest ?? null) : null,
            kmhMinimumPayment: data.hasKmh ? (data.kmhMinimumPayment ?? null) : null,
            kmhNextCutOffDate: data.hasKmh ? (data.kmhNextCutOffDate ?? null) : null,
            kmhNextPaymentDate: data.hasKmh ? (data.kmhNextPaymentDate ?? null) : null,
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
        hasKmh?: boolean
        kmhLimit?: number | null
        kmhInterestRate?: number | null
        kmhCutOffDay?: number | null
        kmhPaymentDueDay?: number | null
        kmhStatementDate?: Date | null
        kmhStatementPrincipal?: number | null
        kmhStatementInterest?: number | null
        kmhMinimumPayment?: number | null
        kmhNextCutOffDate?: Date | null
        kmhNextPaymentDate?: Date | null
        isDefault?: boolean
        notes?: string | null
    }
): Promise<Account> {
    if (data.hasKmh) {
        assertOptionalRange(data.kmhLimit, 'KMH limiti', 0)
        assertOptionalRange(data.kmhInterestRate, 'KMH faiz orani', 0, 100)
        assertOptionalDay(data.kmhCutOffDay, 'KMH hesap kesim gunu')
        assertOptionalDay(data.kmhPaymentDueDay, 'KMH son odeme gunu')
        assertOptionalRange(data.kmhStatementPrincipal, 'KMH anapara borcu', 0)
        assertOptionalRange(data.kmhStatementInterest, 'KMH donem faizi', 0)
        assertOptionalRange(data.kmhMinimumPayment, 'KMH asgari odeme', 0)
    }

    await prisma.account.findFirstOrThrow({
        where: { id: accountId, userId },
        select: { id: true },
    })

    if (data.isDefault) {
        await prisma.account.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        })
    }

    return prisma.account.update({
        where: { id: accountId },
        data: {
            ...data,
            kmhLimit: data.hasKmh ? (data.kmhLimit ?? null) : null,
            kmhInterestRate: data.hasKmh ? (data.kmhInterestRate ?? null) : null,
            kmhCutOffDay: data.hasKmh ? (data.kmhCutOffDay ?? null) : null,
            kmhPaymentDueDay: data.hasKmh ? (data.kmhPaymentDueDay ?? null) : null,
            kmhStatementDate: data.hasKmh ? (data.kmhStatementDate ?? null) : null,
            kmhStatementPrincipal: data.hasKmh ? (data.kmhStatementPrincipal ?? null) : null,
            kmhStatementInterest: data.hasKmh ? (data.kmhStatementInterest ?? null) : null,
            kmhMinimumPayment: data.hasKmh ? (data.kmhMinimumPayment ?? null) : null,
            kmhNextCutOffDate: data.hasKmh ? (data.kmhNextCutOffDate ?? null) : null,
            kmhNextPaymentDate: data.hasKmh ? (data.kmhNextPaymentDate ?? null) : null,
        },
    })
}

export async function deleteAccount(accountId: string, userId: string): Promise<void> {
    await prisma.account.findFirstOrThrow({
        where: { id: accountId, userId },
        select: { id: true },
    })

    await prisma.$transaction([
        prisma.ledgerEntry.updateMany({
            where: { userId, accountId },
            data: { accountId: null },
        }),
        prisma.rPTransaction.updateMany({
            where: {
                accountId,
                receivablePayable: { userId },
            },
            data: { accountId: null },
        }),
        prisma.account.delete({
            where: { id: accountId },
        }),
    ])
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
    assertFinite(newBalance, 'Yeni bakiye')

    const account = await prisma.account.findFirstOrThrow({ where: { id: accountId, userId } })
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
        throw new ActionError('Aynı hesaba transfer yapilamaz.')
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ActionError('Transfer tutari sifirdan buyuk olmalidir.')
    }

    const fromAccount = await prisma.account.findFirstOrThrow({ where: { id: fromAccountId, userId } })
    const toAccount = await prisma.account.findFirstOrThrow({ where: { id: toAccountId, userId } })

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
