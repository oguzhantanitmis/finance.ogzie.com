'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { refreshInsights } from '@/lib/insight-engine'


export async function addAsset(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return

    const name = formData.get('name') as string
    const type = formData.get('type') as any
    const amount = parseFloat(formData.get('amount') as string)
    const currency = formData.get('currency') as string

    try {
        await prisma.asset.create({
            data: {
                name,
                type,
                amount,
                currency,
                user: { connect: { email: session.user?.email! } }
            },
        })
        revalidatePath('/assets')
        revalidatePath('/')
    } catch (error) {
        console.error('Add Asset Error:', error)
    }
}

export async function addDebt(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return

    const name = formData.get('name') as string
    const type = formData.get('type') as any
    const totalBalance = parseFloat(formData.get('totalBalance') as string)
    const remainingBalance = parseFloat(formData.get('remainingBalance') as string)
    const interestRate = parseFloat(formData.get('interestRate') as string)

    try {
        await prisma.debt.create({
            data: {
                name,
                type,
                totalBalance,
                remainingBalance,
                interestRate
            },
        })
        revalidatePath('/debts')
        revalidatePath('/')
    } catch (error) {
        console.error('Add Debt Error:', error)
    }
}

export async function addTransaction(data: any) {
    // Placeholder for future transaction logic
}

export async function addSubscription(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return

    const name = formData.get('name') as string
    const amount = parseFloat(formData.get('amount') as string)
    const currency = formData.get('currency') as string
    const billingCycle = formData.get('billingCycle') as string
    const category = formData.get('category') as string
    const nextPaymentStr = formData.get('nextPayment') as string

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user?.email! } })
        if (!user) return

        await prisma.subscription.create({
            data: {
                name,
                amount,
                currency,
                billingCycle,
                category,
                nextPayment: new Date(nextPaymentStr),
                user: { connect: { id: user.id } }
            },
        })

        // Bu işlem sonrası insightları tetikle
        await refreshInsights(user.id)

        revalidatePath('/subscriptions')
        revalidatePath('/')
    } catch (error) {
        console.error('Add Subscription Error:', error)
    }
}

export async function deleteSubscription(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return

    try {
        await prisma.subscription.delete({ where: { id } })
        revalidatePath('/subscriptions')
        revalidatePath('/')
    } catch (error) {
        console.error('Delete Subscription Error:', error)
    }
}

export async function markInsightAsRead(id: string) {
    const session = await getServerSession(authOptions)
    if (!session) return

    try {
        await prisma.aIInsight.update({
            where: { id },
            data: { isRead: true }
        })
        revalidatePath('/')
    } catch (error) {
        console.error('Mark Insight Error:', error)
    }
}
