'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ============================================================
// 🏦 Kredi Kartı Server Actions
// ============================================================

export async function addCreditCard(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return { error: 'Unauthorized' }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return { error: 'User not found' }

    const totalLimit = parseFloat(formData.get('totalLimit') as string)

    try {
        await prisma.creditCard.create({
            data: {
                userId: user.id,
                cardName: formData.get('cardName') as string,
                bankName: formData.get('bankName') as string,
                last4Digits: formData.get('last4Digits') as string || '0000',
                cardNetwork: (formData.get('cardNetwork') as any) || 'VISA',
                totalLimit,
                cashAdvanceLimit: parseFloat(formData.get('cashAdvanceLimit') as string) || totalLimit * 0.5,
                cutOffDay: parseInt(formData.get('cutOffDay') as string) || 1,
                paymentDueDay: parseInt(formData.get('paymentDueDay') as string) || 10,
                contractualRate: parseFloat(formData.get('contractualRate') as string) || 4.42,
                defaultRate: parseFloat(formData.get('defaultRate') as string) || 5.42,
                cashAdvanceRate: parseFloat(formData.get('cashAdvanceRate') as string) || 5.92,
                minPaymentRate: totalLimit > 50000 ? 0.40 : 0.20,
                rewardsPoints: parseFloat(formData.get('rewardsPoints') as string) || 0,
                color: formData.get('color') as string || '#6366F1',
            },

        })
        revalidatePath('/cards')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Add Credit Card Error:', error)
        return { error: 'Kart eklenemedi' }
    }
}

export async function deleteCreditCard(cardId: string) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized' }

    try {
        await prisma.creditCard.delete({ where: { id: cardId } })
        revalidatePath('/cards')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Delete Card Error:', error)
        return { error: 'Kart silinemedi' }
    }
}

export async function addCardTransaction(data: {
    creditCardId: string
    type: string
    description: string
    merchant?: string
    amount: number
    totalInstallments?: number
    isCashAdvance?: boolean
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized' }

    try {
        await prisma.cardTransaction.create({
            data: {
                creditCardId: data.creditCardId,
                type: data.type as any,
                description: data.description,
                merchant: data.merchant,
                amount: data.amount,
                remainingAmount: data.amount,
                totalInstallments: data.totalInstallments || 1,
                isCashAdvance: data.isCashAdvance || false,
            },
        })
        revalidatePath(`/cards/${data.creditCardId}`)
        revalidatePath('/cards')
        return { success: true }
    } catch (error) {
        console.error('Add Transaction Error:', error)
        return { error: 'İşlem eklenemedi' }
    }
}

export async function makeCardPayment(data: {
    creditCardId: string
    amount: number
    description?: string
    statementId?: string
}) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized' }

    try {
        await prisma.cardPayment.create({
            data: {
                creditCardId: data.creditCardId,
                amount: data.amount,
                description: data.description || 'Manuel Ödeme',
                statementId: data.statementId,
                allocationDetail: {},
            },
        })
        revalidatePath(`/cards/${data.creditCardId}`)
        revalidatePath('/cards')
        revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error('Payment Error:', error)
        return { error: 'Ödeme kaydedilemedi' }
    }
}

// Yardımcı: Kartın güncel borcunu hesapla
export async function getCardCurrentDebt(creditCardId: string): Promise<number> {
    const transactions = await prisma.cardTransaction.findMany({
        where: { creditCardId },
    })
    const payments = await prisma.cardPayment.findMany({
        where: { creditCardId },
    })

    const totalCharges = transactions
        .filter(t => !['REFUND'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)

    const totalRefunds = transactions
        .filter(t => t.type === 'REFUND')
        .reduce((sum, t) => sum + t.amount, 0)

    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0)

    return Math.max(totalCharges - totalRefunds - totalPayments, 0)
}

export async function updateCardPoints(cardId: string, points: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: 'Unauthorized' }

    try {
        await prisma.creditCard.update({
            where: { id: cardId },
            data: { rewardsPoints: points }
        })
        revalidatePath(`/cards/${cardId}`)
        revalidatePath('/cards')
        return { success: true }
    } catch (error) {
        console.error('Update Points Error:', error)
        return { error: 'Puan güncellenemedi' }
    }
}

