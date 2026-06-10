import { redirect } from 'next/navigation'
import { PieChart, TrendingUp } from 'lucide-react'

import PageShell from '@/components/PageShell'
import AnalyticsMobile, { type CategorySlice } from '@/components/analytics/AnalyticsMobile'
import { monthKeyShortTr } from '@/lib/mobile-format'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCategoryBreakdown, getMonthlyReports } from '@/lib/report-service'
import { getCurrentUser } from '@/lib/server-auth'
import { formatBillingCycleLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const CATEGORY_ACCENTS = ['info', 'success', 'warning', 'purple', 'danger'] as const

export default async function AnalyticsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const [summary, recentBreakdown, monthly] = await Promise.all([
        getMonthlyBudgetSummary(user.id),
        getCategoryBreakdown(user.id, 30).catch(() => []),
        getMonthlyReports(user.id, 6).catch(() => []),
    ])
    // Son 30 günde harcama yoksa pencereyi 6 aya genişlet — donut boş kalmasın
    const categoryBreakdown = recentBreakdown.length > 0
        ? recentBreakdown
        : await getCategoryBreakdown(user.id, 180).catch(() => [])
    const topSubscriptions = [...summary.subscriptions]
        .sort((left, right) => right.monthlyNormalizedAmount - left.monthlyNormalizedAmount)
        .slice(0, 5)
    const topRecurring = [...summary.recurringExpenses]
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5)

    // Mobil: ilk 4 kategori + kalanı "Diğer"
    const top4 = categoryBreakdown.slice(0, 4)
    const restTotal = categoryBreakdown.slice(4).reduce((sum, c) => sum + c.amount, 0)
    const mobileCategories: CategorySlice[] = [
        ...top4.map((c, i) => ({ label: c.category, amount: c.amount, color: CATEGORY_ACCENTS[i] as CategorySlice['color'] })),
        ...(restTotal > 0 ? [{ label: 'Diğer', amount: +restTotal.toFixed(2), color: CATEGORY_ACCENTS[4] as CategorySlice['color'] }] : []),
    ]
    const last6 = monthly.slice(-6)

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <AnalyticsMobile
                    categories={mobileCategories}
                    netTrend={last6.map((m) => m.net)}
                    months={last6.map((m) => monthKeyShortTr(m.month))}
                />
            </div>
            <div className="hidden lg:block">
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
                    <p className="text-3xl font-bold privacy-blur">{formatCurrency(summary.netWorth, 'TRY')}</p>
                </div>
                <div className="fintech-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <PieChart className="w-5 h-5 text-sky-400" />
                        <h2 className="font-semibold">Abonelik yükü</h2>
                    </div>
                    <p className="text-3xl font-bold privacy-blur">{formatCurrency(summary.subscriptionLoad, 'TRY')}</p>
                </div>
                <div className="fintech-card p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <PieChart className="w-5 h-5 text-amber-400" />
                        <h2 className="font-semibold">Sabit gider yükü</h2>
                    </div>
                    <p className="text-3xl font-bold privacy-blur">{formatCurrency(summary.recurringLoad, 'TRY')}</p>
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
                                        <p className="font-bold privacy-blur">{formatCurrency(subscription.monthlyNormalizedAmount, 'TRY')}</p>
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
                                        <p className="font-bold privacy-blur">{formatCurrency(expense.amount, expense.currency)}</p>
                                        <p className="text-xs text-zinc-500 uppercase tracking-[0.25em]">{formatBillingCycleLabel(expense.billingCycle)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            </div>
        </PageShell>
    )
}
