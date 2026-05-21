'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BudgetAlertState, BudgetAlertType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// Get all open notifications for the user
export async function getUnreadNotifications() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        const alerts = await prisma.budgetAlert.findMany({
            where: {
                userId: session.user.id,
                state: 'OPEN',
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        return { success: true, alerts }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Mark a specific notification as read (dismissed)
export async function markNotificationAsRead(id: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        await prisma.budgetAlert.updateMany({
            where: {
                id,
                userId: session.user.id
            },
            data: {
                state: 'DISMISSED',
                dismissedAt: new Date()
            }
        })

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        await prisma.budgetAlert.updateMany({
            where: {
                userId: session.user.id,
                state: 'OPEN'
            },
            data: {
                state: 'DISMISSED',
                dismissedAt: new Date()
            }
        })

        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// (Internal System) Function to generate system alerts dynamically based on user debts/cards
export async function generateSystemAlerts() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        // Example Logic: Check for upcoming payments (less than 3 days)
        const creditCards = await prisma.creditCard.findMany({
            where: { userId: session.user.id }
        });

        // We can create alerts for cards whose payment due day is approaching
        const today = new Date();
        const currentDay = today.getDate();

        for (const card of creditCards) {
            if (card.paymentDueDay) {
                // Determine if payment due is within the next 3 days
                let daysUntilDue = card.paymentDueDay - currentDay;
                if (daysUntilDue < 0) {
                    daysUntilDue += 30; // Roughly next month
                }
                
                if (daysUntilDue > 0 && daysUntilDue <= 3) {
                    const dedupeKey = `UPCOMING_PAYMENT_${card.id}_${today.getFullYear()}_${today.getMonth()}`;
                    
                    // Upsert to avoid duplicates
                    await prisma.budgetAlert.upsert({
                        where: { dedupeKey },
                        update: {},
                        create: {
                            userId: session.user.id,
                            type: 'UPCOMING_PAYMENT',
                            title: 'Yaklaşan Kredi Kartı Ödemesi',
                            content: `${card.bankName} (${card.last4Digits}) kartınızın son ödeme tarihine ${daysUntilDue} gün kaldı. Lütfen gecikmeye düşmemek için planlamanızı yapın.`,
                            dedupeKey,
                            channel: 'IN_APP',
                        }
                    })
                }
            }
        }
        
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
