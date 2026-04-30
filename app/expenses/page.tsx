import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import ExpensesWorkspace from '@/components/expenses/ExpensesWorkspace'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)

    return (
        <PageShell width="genis">
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
        </PageShell>
    )
}
