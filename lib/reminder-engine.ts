import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns'
import { BudgetAlertState, BudgetAlertType } from '@prisma/client'

import type { MonthlyBudgetSummary } from '@/lib/finance-os-types'
import { prisma } from '@/lib/prisma'

export interface ReminderPayload {
    subject: string
    body: string
    to: string
}

export interface ReminderDeliveryProvider {
    send(payload: ReminderPayload): Promise<void>
}

export class NoopReminderDeliveryProvider implements ReminderDeliveryProvider {
    async send() {
        return Promise.resolve()
    }
}

function buildDedupeKey(userId: string, type: BudgetAlertType, suffix: string) {
    return `${userId}:${type}:${suffix}`
}

async function ensureAlert(args: {
    userId: string
    type: BudgetAlertType
    title: string
    content: string
    dueDate?: Date
    suffix: string
}) {
    const dedupeKey = buildDedupeKey(args.userId, args.type, args.suffix)
    const existing = await prisma.budgetAlert.findUnique({
        where: { dedupeKey },
    })

    if (existing) {
        return existing
    }

    return prisma.budgetAlert.create({
        data: {
            userId: args.userId,
            type: args.type,
            title: args.title,
            content: args.content,
            dueDate: args.dueDate,
            dedupeKey,
        },
    })
}

export async function syncBudgetAlerts(userId: string, summary: MonthlyBudgetSummary) {
    const now = new Date()
    const today = startOfDay(now)
    const soonThreshold = addDays(today, 7)

    const creations: Promise<unknown>[] = []

    summary.upcomingObligations
        .filter((obligation) => obligation.dueDate <= soonThreshold)
        .forEach((obligation) => {
            creations.push(
                ensureAlert({
                    userId,
                    type: BudgetAlertType.UPCOMING_PAYMENT,
                    title: `${obligation.name} ödemesi yaklaşıyor`,
                    content: `${obligation.name} için ${obligation.amount.toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: obligation.currency === 'TL' ? 'TRY' : obligation.currency,
                    })} ödeme ${differenceInCalendarDays(obligation.dueDate, today)} gün içinde.`,
                    dueDate: obligation.dueDate,
                    suffix: `${obligation.source}:${obligation.id}:${startOfDay(obligation.dueDate).toISOString()}`,
                }),
            )
        })

    if (summary.freeCash < 0) {
        creations.push(
            ensureAlert({
                userId,
                type: BudgetAlertType.BUDGET_PRESSURE,
                title: 'Bu ay serbest nakit eksiye düşüyor',
                content: `Bu ay planlanan gelir, sabit yükler ve borç ödemeleri sonrasında ${Math.abs(summary.freeCash).toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                })} açık veriyor.`,
                suffix: `budget-pressure:${summary.month.toISOString()}`,
            }),
        )
    }

    const yearlyRenewals = summary.subscriptions.filter((subscription) => {
        if (subscription.billingCycle !== 'YEARLY') {
            return false
        }

        return differenceInCalendarDays(subscription.nextPayment, now) <= 21
    })

    yearlyRenewals.forEach((subscription) => {
        creations.push(
            ensureAlert({
                userId,
                type: BudgetAlertType.RENEWAL,
                title: `${subscription.name} yıllık yenileme`,
                content: `${subscription.name} yıllık yenilemesi yaklaşıyor. Aylık normalize etkisi ${subscription.monthlyNormalizedAmount.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: subscription.currency === 'TL' ? 'TRY' : subscription.currency,
                })}.`,
                dueDate: subscription.nextPayment,
                suffix: `renewal:${subscription.id}:${startOfDay(subscription.nextPayment).toISOString()}`,
            }),
        )
    })

    await Promise.all(creations)

    return prisma.budgetAlert.findMany({
        where: { userId, state: BudgetAlertState.OPEN },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 8,
    })
}
