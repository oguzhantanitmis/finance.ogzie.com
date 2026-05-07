'use server'

import {
    simulateCancelSubscriptions,
    simulateCardPaymentChange,
    simulateExtraPayment,
    simulateIncomeChange,
    simulateMinimumPaymentTrap,
} from '@/lib/simulation-engine'
import { requireCurrentUser } from '@/lib/server-auth'

export async function simulateCancelSubscriptionsAction(subscriptionIds: string[]) {
    const user = await requireCurrentUser()
    return simulateCancelSubscriptions(user.id, subscriptionIds)
}

export async function simulateExtraPaymentAction(debtId: string, extraAmount: number) {
    const user = await requireCurrentUser()
    return simulateExtraPayment(user.id, debtId, extraAmount)
}

export async function simulateIncomeChangeAction(newMonthlyIncome: number) {
    const user = await requireCurrentUser()
    return simulateIncomeChange(user.id, newMonthlyIncome)
}

export async function simulateCardPaymentChangeAction(cardId: string, paymentAmount: number) {
    const user = await requireCurrentUser()
    return simulateCardPaymentChange(user.id, cardId, paymentAmount)
}

export async function simulateMinimumPaymentTrapAction() {
    const user = await requireCurrentUser()
    return simulateMinimumPaymentTrap(user.id)
}
