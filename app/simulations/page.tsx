import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import SimulationsWorkspace from '@/components/simulations/SimulationsWorkspace'
import { getCurrentUser } from '@/lib/server-auth'
import { prisma } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

export const dynamic = 'force-dynamic'

export default async function SimulationsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let subs: Array<{ id: string; name: string; monthly: number }> = []
    let debtsList: Array<{ id: string; name: string; balance: number }> = []
    let cardsList: Array<{ id: string; name: string; debt: number; minPayment: number }> = []
    let cash = 0
    let monthlyIncome = 0

    try {
        const [subscriptions, debts, cards, incomes, availCash] = await Promise.all([
            prisma.subscription.findMany({ where: { userId: user.id, isActive: true, status: 'ACTIVE' }, select: { id: true, name: true, amount: true, monthlyNormalizedAmount: true } }),
            prisma.debtAccount.findMany({ where: { userId: user.id, status: { not: 'CLOSED' }, currentBalance: { gt: 0 } }, select: { id: true, name: true, currentBalance: true, counterpartyName: true } }),
            prisma.creditCard.findMany({
                where: { userId: user.id, status: 'ACTIVE' },
                include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1, select: { statementBalance: true, minimumPayment: true } } },
            }),
            prisma.incomeSource.findMany({ where: { userId: user.id }, select: { amount: true, billingCycle: true } }),
            getAvailableCash(user.id),
        ])
        subs = subscriptions.map((s) => ({ id: s.id, name: s.name, monthly: s.monthlyNormalizedAmount ?? s.amount }))
        debtsList = debts.map((d) => ({ id: d.id, name: d.counterpartyName ? `${d.name} (${d.counterpartyName})` : d.name, balance: d.currentBalance }))
        cardsList = cards.map((c) => ({
            id: c.id,
            name: c.cardName,
            debt: c.statements[0]?.statementBalance ?? 0,
            minPayment: c.statements[0]?.minimumPayment ?? 0,
        }))
        cash = availCash
        monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)
    } catch (e) {
        console.error('SimulationsPage error:', e)
    }

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Simülasyon</h1>
                <p className="text-zinc-400 max-w-3xl">
                    &quot;Ne olurdu?&quot; senaryoları ile kararlarının etkisini önceden gör. 3 aylık projeksiyon ve risk analizi dahil.
                </p>
            </header>
            <SimulationsWorkspace
                subscriptions={subs}
                debts={debtsList}
                cards={cardsList}
                currentCash={cash}
                currentMonthlyIncome={monthlyIncome}
            />
        </PageShell>
    )
}
