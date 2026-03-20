import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import RecurringWorkspace from '@/components/recurring/RecurringWorkspace'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Sabit ödemeler</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Sabit Giderler</h1>
                <p className="text-zinc-400 max-w-3xl">
                    Kira, aidat, sigorta, internet ve abonelik dışı tüm düzenli ödemelerini ayrı bir modülde tut.
                </p>
            </header>

            <RecurringWorkspace
                recurringLoad={summary.recurringLoad}
                recurringExpenses={summary.recurringExpenses.map((expense) => ({
                    id: expense.id,
                    name: expense.name,
                    amount: expense.amount,
                    currency: expense.currency,
                    billingCycle: expense.billingCycle,
                    nextPayment: expense.nextPayment.toISOString(),
                    category: expense.category,
                    status: expense.status,
                    isEssential: expense.isEssential,
                    autopay: expense.autopay,
                    notes: expense.notes,
                }))}
            />
        </PageShell>
    )
}
