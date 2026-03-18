'use server'

import { RPStatus, type ReceivablePayable } from '@prisma/client'
import { prisma } from '@/lib/prisma'

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
    if (amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const rp = await prisma.receivablePayable.findUniqueOrThrow({ where: { id: rpId } })
    if (amount > rp.remainingAmount) throw new Error('Tahsilat tutarı kalan alacaktan büyük olamaz.')

    const newRemaining = +(rp.remainingAmount - amount).toFixed(2)
    const newStatus: RPStatus = newRemaining <= 0 ? 'CLOSED' : 'PARTIAL'

    await prisma.$transaction([
        prisma.rPTransaction.create({
            data: {
                receivablePayableId: rpId,
                amount,
                accountId,
                description: description || 'Tahsilat',
            },
        }),
        prisma.receivablePayable.update({
            where: { id: rpId },
            data: { remainingAmount: newRemaining, status: newStatus },
        }),
        prisma.account.update({
            where: { id: accountId },
            data: { balance: { increment: amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'COLLECTION',
                amount,
                currency: rp.currency,
                description: description || `Tahsilat: ${rp.description}`,
                accountId,
                rpTransactionId: undefined,
                date: new Date(),
            },
        }),
    ])
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
    if (amount <= 0) throw new Error('Tutar sıfırdan büyük olmalıdır.')

    const rp = await prisma.receivablePayable.findUniqueOrThrow({ where: { id: rpId } })
    if (amount > rp.remainingAmount) throw new Error('Ödeme tutarı kalan borçtan büyük olamaz.')

    const newRemaining = +(rp.remainingAmount - amount).toFixed(2)
    const newStatus: RPStatus = newRemaining <= 0 ? 'CLOSED' : 'PARTIAL'

    await prisma.$transaction([
        prisma.rPTransaction.create({
            data: {
                receivablePayableId: rpId,
                amount,
                accountId,
                description: description || 'Ödeme',
            },
        }),
        prisma.receivablePayable.update({
            where: { id: rpId },
            data: { remainingAmount: newRemaining, status: newStatus },
        }),
        prisma.account.update({
            where: { id: accountId },
            data: { balance: { decrement: amount } },
        }),
        prisma.ledgerEntry.create({
            data: {
                userId,
                type: 'PAYMENT_TO_PERSON',
                amount: -amount,
                currency: rp.currency,
                description: description || `Ödeme: ${rp.description}`,
                accountId,
                date: new Date(),
            },
        }),
    ])
}
