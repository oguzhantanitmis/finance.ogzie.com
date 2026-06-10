import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import PaymentPlanWorkspace from '@/components/payment-plan/PaymentPlanWorkspace'
import PaymentPlanMobile, { type PlanData } from '@/components/payment-plan/PaymentPlanMobile'
import { generatePaymentPlan, type Strategy, type PaymentPlan } from '@/lib/debt-priority-engine'
import { monthYearTr } from '@/lib/mobile-format'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const emptyPlan: PaymentPlan = {
    strategy: 'SAFE',
    items: [],
    totalMinPayment: 0,
    totalAvailable: 0,
    surplus: 0,
    riskLevel: 'LOW',
    warnings: [],
    monthlyDebtBudget: 0,
    estimatedFinishDate: null,
    totalInterestEstimate: 0,
    interestSavingEstimate: 0,
    rationale: '',
    pros: [],
    cons: [],
}

export default async function PaymentPlanPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let plans: Record<Strategy, PaymentPlan> = {
        SAFE: { ...emptyPlan, strategy: 'SAFE' },
        AVALANCHE: { ...emptyPlan, strategy: 'AVALANCHE' },
        SNOWBALL: { ...emptyPlan, strategy: 'SNOWBALL' },
        CASHFLOW: { ...emptyPlan, strategy: 'CASHFLOW' },
        RISK: { ...emptyPlan, strategy: 'RISK' },
        GOAL: { ...emptyPlan, strategy: 'GOAL' },
    }

    try {
        const [safe, avalanche, snowball, cashflow, risk, goal] = await Promise.all([
            generatePaymentPlan(user.id, 'SAFE'),
            generatePaymentPlan(user.id, 'AVALANCHE'),
            generatePaymentPlan(user.id, 'SNOWBALL'),
            generatePaymentPlan(user.id, 'CASHFLOW'),
            generatePaymentPlan(user.id, 'RISK'),
            generatePaymentPlan(user.id, 'GOAL'),
        ])
        plans = { SAFE: safe, AVALANCHE: avalanche, SNOWBALL: snowball, CASHFLOW: cashflow, RISK: risk, GOAL: goal }
    } catch (e) {
        console.error('PaymentPlanPage error:', e)
    }

    // Mobil ekran: desktop varsayılanı olan SAFE stratejisi
    const safe = plans.SAFE
    const mobilePlan: PlanData = {
        strategy: 'Güvenli Mod',
        payoffDate: monthYearTr(safe.estimatedFinishDate),
        monthlyBudget: safe.totalAvailable,
        saved: Math.max(0, safe.interestSavingEstimate),
        steps: safe.items.map((it, i) => ({
            order: i + 1,
            name: it.name,
            rate: +it.interestRate.toFixed(2),
            remaining: it.balance,
            focus: i === 0,
        })),
    }

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <PaymentPlanMobile plan={mobilePlan} />
            </div>
            <div className="hidden lg:block">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Borç Ödeme Planı</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        3 farklı stratejiyle borçlarını önceliklendir. Güvenli mod, çığ modu (faiz minimize) veya kartopu modu (motivasyon).
                    </p>
                </header>
                <PaymentPlanWorkspace plans={plans} />
            </div>
        </PageShell>
    )
}
