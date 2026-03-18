import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import GoalsWorkspace from '@/components/goals/GoalsWorkspace'
import { getGoals } from '@/lib/goal-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const goals = await getGoals(user.id)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Finansal Hedefler</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Borç kapatma, tasarruf ve birikim hedefleri belirle. İlerlemeni takip et.
                    </p>
                </header>
                <GoalsWorkspace goals={goals.map((g) => ({ ...g, targetDate: g.targetDate.toISOString(), createdAt: g.createdAt.toISOString(), updatedAt: g.updatedAt.toISOString() }))} />
            </PageShell>
        </div>
    )
}
