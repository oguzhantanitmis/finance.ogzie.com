import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import SimulationsWorkspace from '@/components/simulations/SimulationsWorkspace'
import SimulationMobile, { type SimData } from '@/components/simulations/SimulationMobile'
import { generatePaymentPlan } from '@/lib/debt-priority-engine'
import { monthDiff, monthYearTr } from '@/lib/mobile-format'
import { getCurrentUser } from '@/lib/server-auth'
import { prisma, withDbRetry } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

export const dynamic = 'force-dynamic'

/** Mobil senaryolar: mevcut ödeme planı motoruyla server-side hesaplanır. */
async function buildSimData(userId: string, subsMonthlyTotal: number): Promise<SimData> {
    const base = await generatePaymentPlan(userId, 'SAFE')
    const budget = base.totalAvailable

    const defs = [
        { id: 'extra1000', label: 'Aylık +₺1.000 ek ödeme', run: () => generatePaymentPlan(userId, 'SAFE', budget + 1000) },
        { id: 'extra2500', label: 'Aylık +₺2.500 ek ödeme', run: () => generatePaymentPlan(userId, 'SAFE', budget + 2500) },
        ...(subsMonthlyTotal > 0
            ? [{ id: 'cancelSubs', label: 'Tüm abonelikleri iptal et', run: () => generatePaymentPlan(userId, 'SAFE', budget + subsMonthlyTotal) }]
            : []),
        { id: 'avalanche', label: 'Çığ stratejisine geç', run: () => generatePaymentPlan(userId, 'AVALANCHE', budget) },
    ]
    const plans = base.estimatedFinishDate ? await Promise.all(defs.map((d) => d.run())) : []

    return {
        base: {
            payoff: monthYearTr(base.estimatedFinishDate),
            interest: Math.round(base.totalInterestEstimate),
        },
        scenarios: plans.map((plan, i) => ({
            id: defs[i].id,
            label: defs[i].label,
            payoff: monthYearTr(plan.estimatedFinishDate),
            saveMonths: monthDiff(base.estimatedFinishDate, plan.estimatedFinishDate),
            saveInterest: Math.max(0, Math.round(base.totalInterestEstimate - plan.totalInterestEstimate)),
        })),
    }
}

export default async function SimulationsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let subs: Array<{ id: string; name: string; monthly: number }> = []
    let debtsList: Array<{ id: string; name: string; balance: number }> = []
    let cardsList: Array<{ id: string; name: string; debt: number; minPayment: number }> = []
    let cash = 0
    let monthlyIncome = 0
    let simData: SimData = { base: { payoff: '—', interest: 0 }, scenarios: [] }

    try {
        const [subscriptions, debts, cards, incomes, availCash] = await withDbRetry(() => Promise.all([
            prisma.subscription.findMany({ where: { userId: user.id, isActive: true, status: 'ACTIVE' }, select: { id: true, name: true, amount: true, monthlyNormalizedAmount: true } }),
            prisma.debtAccount.findMany({ where: { userId: user.id, status: { not: 'CLOSED' }, currentBalance: { gt: 0 } }, select: { id: true, name: true, currentBalance: true, counterpartyName: true } }),
            prisma.creditCard.findMany({
                where: { userId: user.id, status: 'ACTIVE' },
                include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1, select: { statementBalance: true, minimumPayment: true } } },
            }),
            prisma.incomeSource.findMany({ where: { userId: user.id }, select: { amount: true, billingCycle: true } }),
            getAvailableCash(user.id),
        ]), { retries: 2, delayMs: 400 })
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
        simData = await buildSimData(user.id, subs.reduce((s, x) => s + x.monthly, 0))
    } catch (e) {
        console.error('SimulationsPage error:', e)
    }

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <SimulationMobile data={simData} />
            </div>
            <div className="hidden lg:block">
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
            </div>
        </PageShell>
    )
}
