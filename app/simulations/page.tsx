import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import SimulationsWorkspace from '@/components/simulations/SimulationsWorkspace'
import { getCurrentUser } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

export const dynamic = 'force-dynamic'

export default async function SimulationsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [subscriptions, debts, incomes, cash] = await Promise.all([
        prisma.subscription.findMany({ where: { userId: user.id, isActive: true, status: 'ACTIVE' }, select: { id: true, name: true, amount: true, monthlyNormalizedAmount: true } }),
        prisma.debt.findMany({ where: { userId: user.id }, select: { id: true, name: true, remainingBalance: true } }),
        prisma.incomeSource.findMany({ where: { userId: user.id }, select: { amount: true, billingCycle: true } }),
        getAvailableCash(user.id),
    ])

    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Simülasyon</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        "Ne olurdu?" senaryoları ile kararlarının etkisini önceden gör.
                    </p>
                </header>
                <SimulationsWorkspace
                    subscriptions={subscriptions.map((s) => ({ id: s.id, name: s.name, monthly: s.monthlyNormalizedAmount ?? s.amount }))}
                    debts={debts.map((d) => ({ id: d.id, name: d.name, balance: d.remainingBalance }))}
                    currentCash={cash}
                    currentMonthlyIncome={monthlyIncome}
                />
            </PageShell>
        </div>
    )
}
