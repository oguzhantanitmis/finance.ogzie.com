import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import ReportsWorkspace from '@/components/reports/ReportsWorkspace'
import { getMonthlyReports, getExpenseBreakdown, getNetWorthHistory, getProfessionalReportDashboard } from '@/lib/report-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let monthly: Awaited<ReturnType<typeof getMonthlyReports>> = []
    let expenses: Awaited<ReturnType<typeof getExpenseBreakdown>> = []
    let netWorthHistory: Awaited<ReturnType<typeof getNetWorthHistory>> = []
    let dashboard: Awaited<ReturnType<typeof getProfessionalReportDashboard>> | null = null

    try {
        ;[monthly, expenses, netWorthHistory, dashboard] = await Promise.all([
            getMonthlyReports(user.id, 6),
            getExpenseBreakdown(user.id),
            getNetWorthHistory(user.id),
            getProfessionalReportDashboard(user.id),
        ])
    } catch (e) {
        console.error('ReportsPage error:', e)
    }

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Raporlar</h1>
                <p className="text-zinc-400 max-w-3xl">
                    Aylık gelir-gider akışı, harcama kırılımı ve net varlık trendi.
                </p>
            </header>
            <ReportsWorkspace monthly={monthly} expenses={expenses} netWorthHistory={netWorthHistory} dashboard={dashboard} />
        </PageShell>
    )
}
