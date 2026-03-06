import { redirect } from 'next/navigation'
import { PieChart, TrendingUp } from 'lucide-react'

import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'
import { formatBillingCycleLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)
    const topSubscriptions = [...summary.subscriptions]
        .sort((left, right) => right.monthlyNormalizedAmount - left.monthlyNormalizedAmount)
        .slice(0, 5)
    const topRecurring = [...summary.recurringExpenses]
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5)

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />

            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Analiz</p>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Finansal Analiz</h1>
                    <p className="text-zinc-400">Aylık yüklerin, net varlık ve ödeme baskısı üzerinden sade bir dağılım analizi.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            <h2 className="font-semibold">Net değer</h2>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(summary.netWorth, 'TRY')}</p>
                    </div>
                    <div className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <PieChart className="w-5 h-5 text-sky-400" />
                            <h2 className="font-semibold">Abonelik yükü</h2>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(summary.subscriptionLoad, 'TRY')}</p>
                    </div>
                    <div className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <PieChart className="w-5 h-5 text-amber-400" />
                            <h2 className="font-semibold">Sabit gider yükü</h2>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(summary.recurringLoad, 'TRY')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="fintech-card p-6 md:p-7">
                        <h2 className="text-2xl font-bold mb-5">En yüksek abonelik etkisi</h2>
                        {topSubscriptions.length === 0 ? (
                            <p className="text-zinc-400">Veri yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {topSubscriptions.map((subscription) => (
                                    <div key={subscription.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold">{subscription.name}</p>
                                            <p className="text-sm text-zinc-500">{subscription.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(subscription.monthlyNormalizedAmount, 'TRY')}</p>
                                            <p className="text-xs text-zinc-500 uppercase tracking-[0.25em]">Aylık etki</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="fintech-card p-6 md:p-7">
                        <h2 className="text-2xl font-bold mb-5">En yüksek sabit giderler</h2>
                        {topRecurring.length === 0 ? (
                            <p className="text-zinc-400">Veri yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {topRecurring.map((expense) => (
                                    <div key={expense.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="font-semibold">{expense.name}</p>
                                            <p className="text-sm text-zinc-500">{expense.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                                            <p className="text-xs text-zinc-500 uppercase tracking-[0.25em]">{formatBillingCycleLabel(expense.billingCycle)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PageShell>
        </div>
    )
}
