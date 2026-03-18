import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import HealthScoreWorkspace from '@/components/health/HealthScoreWorkspace'
import { calculateHealthScore, saveHealthSnapshot } from '@/lib/health-score-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function HealthPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const result = await calculateHealthScore(user.id)

    // Snapshot kaydet
    await saveHealthSnapshot(user.id, result)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Finansal Sağlık Puanı</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        6 kritere göre ağırlıklı puanlama. Limit kullanımı, borç/gelir oranı, geciken ödemeler ve daha fazlası.
                    </p>
                </header>
                <HealthScoreWorkspace result={result} />
            </PageShell>
        </div>
    )
}
