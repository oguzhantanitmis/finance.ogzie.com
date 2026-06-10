import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ReportsWorkspace from '@/components/reports/ReportsWorkspace'
import ReportsMobile, { type ReportSeries } from '@/components/reports/ReportsMobile'
import ExportButton from '@/components/ui/ExportButton'
import { monthKeyShortTr } from '@/lib/mobile-format'
import {
    getCategoryBreakdown,
    getDailyCashflow,
    getExpenseBreakdown,
    getMonthlyReports,
    getNetWorthHistory,
    getPeriodComparison,
    getProfessionalReportDashboard,
    getTopDays,
    getTransactionTypeMix,
} from '@/lib/report-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Dönem seçici: 3 / 6 / 12 ay
    const params = await searchParams
    const periodMonths = ['3', '6', '12'].includes(params.p ?? '') ? Number(params.p) : 6

    type Bundle = {
        monthly:          Awaited<ReturnType<typeof getMonthlyReports>>
        expenses:         Awaited<ReturnType<typeof getExpenseBreakdown>>
        netWorthHistory:  Awaited<ReturnType<typeof getNetWorthHistory>>
        dashboard:        Awaited<ReturnType<typeof getProfessionalReportDashboard>> | null
        category:         Awaited<ReturnType<typeof getCategoryBreakdown>>
        daily:            Awaited<ReturnType<typeof getDailyCashflow>>
        comparison:       Awaited<ReturnType<typeof getPeriodComparison>> | null
        topDays:          Awaited<ReturnType<typeof getTopDays>>
        typeMix:          Awaited<ReturnType<typeof getTransactionTypeMix>>
    }

    const bundle: Bundle = {
        monthly: [], expenses: [], netWorthHistory: [], dashboard: null,
        category: [], daily: [], comparison: null,
        topDays: { topIncomeDays: [], topExpenseDays: [] }, typeMix: [],
    }

    try {
        const [monthly, expenses, netWorthHistory, dashboard, category, daily, comparison, topDays, typeMix] = await Promise.all([
            getMonthlyReports(user.id, periodMonths),
            getExpenseBreakdown(user.id),
            getNetWorthHistory(user.id),
            getProfessionalReportDashboard(user.id),
            getCategoryBreakdown(user.id, 30),
            getDailyCashflow(user.id, 90),
            getPeriodComparison(user.id),
            getTopDays(user.id, 60),
            getTransactionTypeMix(user.id, 30),
        ])
        bundle.monthly = monthly
        bundle.expenses = expenses
        bundle.netWorthHistory = netWorthHistory
        bundle.dashboard = dashboard
        bundle.category = category
        bundle.daily = daily
        bundle.comparison = comparison
        bundle.topDays = topDays
        bundle.typeMix = typeMix
    } catch (e) {
        console.error('ReportsPage error:', e)
    }

    const last6 = bundle.monthly.slice(-6)
    const mobileSeries: ReportSeries = {
        months: last6.map((r) => monthKeyShortTr(r.month)),
        income: last6.map((r) => r.income),
        expense: last6.map((r) => r.expense),
    }

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <ReportsMobile data={mobileSeries} />
            </div>
            <div className="hidden lg:block">
            <header className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--text-muted)' }}>
                        Finans paneli
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                        Raporlar & Analitik
                    </h1>
                    <p className="max-w-3xl text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Gelir-gider trendi, kategori kırılımı, net varlık ilerlemesi, yoğun günler ve dönemsel karşılaştırma.
                    </p>
                </div>
                <ExportButton endpoint="/api/export/reports" label="Rapor İndir" />
            </header>

            <ReportsWorkspace bundle={bundle} periodMonths={periodMonths} />
            </div>
        </PageShell>
    )
}
