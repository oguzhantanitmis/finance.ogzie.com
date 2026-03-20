'use server'

import { RPStatus, type ReceivablePayable } from '@prisma/client'
import { ActionError } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'

function resolveRPStatus(originalAmount: number, remainingAmount: number, dueDate?: Date | null): RPStatus {
    if (remainingAmount <= 0) {
        return 'CLOSED'
    }

    if (dueDate && dueDate < new Date()) {
        return remainingAmount < originalAmount ? 'PARTIAL' : 'OVERDUE'
    }

    return remainingAmount < originalAmount ? 'PARTIAL' : 'OPEN'
}

/**
 * Alacak veya verecek kaydı oluşturur.
 */
export async function createRP(
    userId: string,
    data: {
        personId: string
        type: 'RECEIVABLE' | 'PAYABLE'
        description: string
        originalAmount: number
        currency?: string
        dueDate?: Date | null
        notes?: string
        isInstallment?: boolean
        installmentCount?: number
    }
): Promise<ReceivablePayable> {
    await prisma.person.findFirstOrThrow({
        where: { id: data.personId, userId },
        select: { id: true },
    })

    return prisma.receivablePayable.create({
        data: {
            userId,
            personId: data.personId,
            type: data.type,
            description: data.description,
            originalAmount: data.originalAmount,
            remainingAmount: data.originalAmount,
            currency: data.currency ?? 'TRY',
            dueDate: data.dueDate ?? null,
            notes: data.notes ?? null,
            isInstallment: data.isInstallment ?? false,
            installmentCount: data.installmentCount ?? null,
            status: 'OPEN',
        },
    })
}

export async function updateRP(
    userId: string,
    rpId: string,
    data: {
        type: 'RECEIVABLE' | 'PAYABLE'
        description: string
        originalAmount: number
        remainingAmount: number
        currency?: string
        dueDate?: Date | null
        notes?: string
    },
): Promise<ReceivablePayable> {
    const existing = await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        select: { id: true },
    })

    if (!existing) {
        throw new ActionError('Kayit bulunamadi.')
    }

    return prisma.receivablePayable.update({
        where: { id: rpId },
        data: {
            type: data.type,
            description: data.description,
            originalAmount: data.originalAmount,
            remainingAmount: data.remainingAmount,
            currency: data.currency ?? 'TRY',
            dueDate: data.dueDate ?? null,
            notes: data.notes ?? null,
            status: resolveRPStatus(data.originalAmount, data.remainingAmount, data.dueDate),
        },
    })
}

export async function deleteRP(userId: string, rpId: string): Promise<void> {
    await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        select: { id: true },
    })
    await prisma.receivablePayable.delete({ where: { id: rpId } })
}

/**
 * Tahsilat girişi (alacak tahsil etme).
 * 1. RPTransaction oluştur
 * 2. ReceivablePayable.remainingAmount güncelle
 * 3. Account.balance += amount
 * 4. LedgerEntry (COLLECTION) oluştur
 * 5. Status güncelle
 * Tüm işlemler atomic ($transaction).
 */
export async function recordCollection(
    userId: string,
    rpId: string,
    amount: number,
    accountId: string,
    description?: string
): Promise<void> {
    if (amount <= 0) throw new ActionError('Tutar sifirdan buyuk olmalidir.')

    const [rp, account] = await Promise.all([
        prisma.receivablePayable.findFirstOrThrow({ where: { id: rpId, userId } }),
        prisma.account.findFirstOrThrow({ where: { id: accountId, userId } }),
    ])

    if (amount > rp.remainingAmount) throw new ActionError('Tahsilat tutari kalan alacaktan buyuk olamaz.')

    const newRemaining = +(rp.remainingAmount - amount).toFixed(2)
    const newStatus: RPStatus = newRemaining <= 0 ? 'CLOSED' : 'PARTIAL'

    await prisma.$transaction(async (tx) => {
        const transaction = await tx.rPTransaction.create({
            data: {
                receivablePayableId: rpId,
                amount,
                accountId,
                description: description || 'Tahsilat',
            },
        })

        await tx.receivablePayable.update({
            where: { id: rpId },
            data: { remainingAmount: newRemaining, status: newStatus },
        })

        await tx.account.update({
            where: { id: account.id },
            data: { balance: { increment: amount } },
        })

        await tx.ledgerEntry.create({
            data: {
                userId,
                type: 'COLLECTION',
                amount,
                currency: rp.currency,
                description: description || `Tahsilat: ${rp.description}`,
                accountId: account.id,
                rpTransactionId: transaction.id,
                date: new Date(),
            },
        })
    })
}

/**
 * Kişiye ödeme (verecek azaltma).
 * 1. RPTransaction oluştur
 * 2. ReceivablePayable.remainingAmount güncelle
 * 3. Account.balance -= amount
 * 4. LedgerEntry (PAYMENT_TO_PERSON) oluştur
 * 5. Status güncelle
 */
export async function recordPaymentToPerson(
    userId: string,
    rpId: string,
    amount: number,
    accountId: string,
    description?: string
): Promise<void> {
    if (amount <= 0) throw new ActionError('Tutar sifirdan buyuk olmalidir.')

    const [rp, account] = await Promise.all([
        prisma.receivablePayable.findFirstOrThrow({ where: { id: rpId, userId } }),
        prisma.account.findFirstOrThrow({ where: { id: accountId, userId } }),
    ])

    if (amount > rp.remainingAmount) throw new ActionError('Odeme tutari kalan borctan buyuk olamaz.')

    const newRemaining = +(rp.remainingAmount - amount).toFixed(2)
    const newStatus: RPStatus = newRemaining <= 0 ? 'CLOSED' : 'PARTIAL'

    await prisma.$transaction(async (tx) => {
        const transaction = await tx.rPTransaction.create({
            data: {
                receivablePayableId: rpId,
                amount,
                accountId,
                description: description || 'Ödeme',
            },
        })

        await tx.receivablePayable.update({
            where: { id: rpId },
            data: { remainingAmount: newRemaining, status: newStatus },
        })

        await tx.account.update({
            where: { id: account.id },
            data: { balance: { decrement: amount } },
        })

        await tx.ledgerEntry.create({
            data: {
                userId,
                type: 'PAYMENT_TO_PERSON',
                amount: -amount,
                currency: rp.currency,
                description: description || `Ödeme: ${rp.description}`,
                accountId: account.id,
                rpTransactionId: transaction.id,
                date: new Date(),
            },
        })
    })
}
