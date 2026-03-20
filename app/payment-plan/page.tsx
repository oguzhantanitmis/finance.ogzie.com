import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import PaymentPlanWorkspace from '@/components/payment-plan/PaymentPlanWorkspace'
import { generatePaymentPlan, type Strategy, type PaymentPlan } from '@/lib/debt-priority-engine'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const emptyPlan: PaymentPlan = { strategy: 'SAFE', items: [], totalRequiredPayment: 0, totalAvailable: 0, surplus: 0, riskLevel: 'LOW', warnings: [] }

export default async function PaymentPlanPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let plans: Record<Strategy, PaymentPlan> = { SAFE: { ...emptyPlan, strategy: 'SAFE' }, AVALANCHE: { ...emptyPlan, strategy: 'AVALANCHE' }, SNOWBALL: { ...emptyPlan, strategy: 'SNOWBALL' } }

    try {
        const [safe, avalanche, snowball] = await Promise.all([
            generatePaymentPlan(user.id, 'SAFE'),
            generatePaymentPlan(user.id, 'AVALANCHE'),
            generatePaymentPlan(user.id, 'SNOWBALL'),
        ])
        plans = { SAFE: safe, AVALANCHE: avalanche, SNOWBALL: snowball }
    } catch (e) {
        console.error('PaymentPlanPage error:', e)
    }

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Borç Ödeme Planı</h1>
                <p className="text-zinc-400 max-w-3xl">
                    3 farklı stratejiyle borçlarını önceliklendir. Güvenli mod, çığ modu (faiz minimize) veya kartopu modu (motivasyon).
                </p>
            </header>
            <PaymentPlanWorkspace plans={plans} />
        </PageShell>
    )
}
