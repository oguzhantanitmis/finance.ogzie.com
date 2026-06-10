import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import HealthScoreWorkspace from '@/components/health/HealthScoreWorkspace'
import HealthMobile, { type HealthFactor } from '@/components/health/HealthMobile'
import { calculateHealthScore, saveHealthSnapshot, type HealthScoreResult } from '@/lib/health-score-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const LEVEL_TR: Record<string, string> = {
    EXCELLENT: 'Mükemmel',
    GOOD: 'İyi',
    MODERATE: 'Orta',
    HIGH: 'Yüksek Risk',
    CRITICAL: 'Kritik',
}

const FACTOR_LABELS: Array<{ key: keyof HealthScoreResult['breakdown']; label: string }> = [
    { key: 'creditUtilization', label: 'Kart Limit Kullanımı' },
    { key: 'debtToIncomeRatio', label: 'Borç / Gelir Oranı' },
    { key: 'minPaymentDependency', label: 'Asgari Ödeme Bağımlılığı' },
    { key: 'overduePayments', label: 'Geciken Ödemeler' },
    { key: 'fixedExpenseRatio', label: 'Sabit Gider Yükü' },
    { key: 'monthlyCashSurplus', label: 'Aylık Nakit Fazlası' },
]

export default async function HealthPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let result: HealthScoreResult = {
        score: 0, level: 'MODERATE',
        isReady: false,
        breakdown: {
            creditUtilization: { score: 0, weight: 25, detail: 'Veri yok' },
            debtToIncomeRatio: { score: 0, weight: 20, detail: 'Veri yok' },
            minPaymentDependency: { score: 0, weight: 15, detail: 'Veri yok' },
            overduePayments: { score: 0, weight: 15, detail: 'Veri yok' },
            fixedExpenseRatio: { score: 0, weight: 15, detail: 'Veri yok' },
            monthlyCashSurplus: { score: 0, weight: 10, detail: 'Veri yok' },
        },
        improvements: [], trend: 'stable',
    }

    try {
        result = await calculateHealthScore(user.id)
        if (result.isReady) {
            await saveHealthSnapshot(user.id, result)
        }
    } catch (e) {
        console.error('HealthPage error:', e)
    }

    const mobileFactors: HealthFactor[] = FACTOR_LABELS.map(({ key, label }) => ({
        key,
        label,
        score: result.breakdown[key].score,
        weight: result.breakdown[key].weight,
        detail: result.breakdown[key].detail,
    }))

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <HealthMobile
                    score={result.score}
                    level={LEVEL_TR[result.level] ?? result.level}
                    factors={mobileFactors}
                />
            </div>
            <div className="hidden lg:block">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Finansal Sağlık Puanı</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        6 kritere göre ağırlıklı puanlama. Limit kullanımı, borç/gelir oranı, geciken ödemeler ve daha fazlası.
                    </p>
                </header>
                <HealthScoreWorkspace result={result} />
            </div>
        </PageShell>
    )
}
