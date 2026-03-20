import { startOfMonth } from 'date-fns'
import { redirect } from 'next/navigation'

import BudgetWorkspace from '@/components/budget/BudgetWorkspace'
import PageShell from '@/components/PageShell'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function monthValue(date: Date) {
    return startOfMonth(date).toISOString().slice(0, 10)
}

export default async function BudgetPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)
    const month = monthValue(summary.month)

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Bütçe yönetimi</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Aylık bütçe merkezi</h1>
                <p className="text-zinc-400 max-w-3xl">
                    Gelirlerini gir, sistem sabit yükler ve borç ödemeleri sonrasında elinde kalan serbest nakdi göstersin.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Planlanan Gelir</p>
                    <p className="text-2xl font-bold privacy-blur">{formatCurrency(summary.plannedIncome, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Sabit yük</p>
                    <p className="text-2xl font-bold privacy-blur">{formatCurrency(summary.fixedCommitments, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Borç baskısı</p>
                    <p className="text-2xl font-bold privacy-blur">{formatCurrency(summary.debtCommitments, 'TRY')}</p>
                </div>
                <div className={`fintech-card p-5 ${summary.freeCash < 0 ? 'border-red-500/30' : 'border-emerald-500/20'}`}>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Serbest Nakit</p>
                    <p className={`text-2xl font-bold privacy-blur ${summary.freeCash < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(summary.freeCash, 'TRY')}</p>
                </div>
            </div>

            <BudgetWorkspace
                summary={{
                    month,
                    plannedIncome: summary.plannedIncome,
                    fixedCommitments: summary.fixedCommitments,
                    debtCommitments: summary.debtCommitments,
                    freeCash: summary.freeCash,
                    bufferTarget: summary.bufferTarget,
                    notes: summary.notes,
                    alerts: summary.alerts.map((alert) => ({
                        id: alert.id,
                        type: alert.type,
                        title: alert.title,
                        content: alert.content,
                    })),
                    incomeSources: summary.incomeSources.map((income) => ({
                        id: income.id,
                        name: income.name,
                        amount: income.amount,
                        currency: income.currency,
                        billingCycle: income.billingCycle,
                        payday: income.payday,
                        status: income.status,
                        isPrimary: income.isPrimary,
                    })),
                }}
            />
        </PageShell>
    )
}
