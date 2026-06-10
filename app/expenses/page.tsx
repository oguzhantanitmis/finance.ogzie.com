import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import PageShell from '@/components/PageShell'
import ExpensesWorkspace from '@/components/expenses/ExpensesWorkspace'
import SubscriptionsMobile, { type SubItem, type RecurringItem } from '@/components/recurring/SubscriptionsMobile'
import { daysUntilTr, hashHue } from '@/lib/mobile-format'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)

    const mobileSubs: SubItem[] = summary.subscriptions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        amount: sub.monthlyNormalizedAmount,
        next: daysUntilTr(sub.nextPayment),
        cat: sub.category ?? 'Diğer',
        hue: hashHue(sub.id),
    }))

    const mobileRecurring: RecurringItem[] = summary.recurringExpenses.map((exp) => ({
        id: exp.id,
        name: exp.name,
        amount: exp.billingCycle === 'YEARLY' ? exp.amount / 12 : exp.amount,
        cat: exp.category ?? 'Diğer',
        dueDay: new Date(exp.nextPayment).getDate(),
    }))

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <SubscriptionsMobile subscriptions={mobileSubs} recurring={mobileRecurring} />
            </div>
            <div className="hidden lg:block">
                <Suspense>
                    <ExpensesWorkspace
                        subscriptions={summary.subscriptions.map((sub) => ({
                            ...sub,
                            nextPayment: sub.nextPayment.toISOString(),
                            source: 'subscription' as const,
                        }))}
                        recurringExpenses={summary.recurringExpenses.map((exp) => ({
                            ...exp,
                            nextPayment: exp.nextPayment.toISOString(),
                            source: 'recurring' as const,
                        }))}
                        subscriptionLoad={summary.subscriptionLoad}
                        recurringLoad={summary.recurringLoad}
                    />
                </Suspense>
            </div>
        </PageShell>
    )
}
