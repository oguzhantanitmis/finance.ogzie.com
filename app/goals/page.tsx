import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import PageShell from '@/components/PageShell'
import GoalsWorkspace from '@/components/goals/GoalsWorkspace'
import GoalsMobile, { type GoalItem } from '@/components/goals/GoalsMobile'
import { getGoals } from '@/lib/goal-service'
import { dateTr } from '@/lib/mobile-format'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const GOAL_ACCENTS = ['info', 'success', 'warning', 'purple', 'danger'] as const

export default async function GoalsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let serializedGoals: Array<{
        id: string
        title: string
        description: string | null
        targetAmount: number
        currentAmount: number
        targetDate: string
        status: string
        category: string | null
        goalType: string
        priority: number
        monthlyRequiredAmount: number | null
        createdAt: string
        updatedAt: string
        progressPercent: number
    }> = []

    try {
        const goals = await getGoals(user.id)
        serializedGoals = goals.map((g) => ({
            ...g,
            targetDate: g.targetDate.toISOString(),
            createdAt: g.createdAt.toISOString(),
            updatedAt: g.updatedAt.toISOString(),
            progressPercent: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
        }))
    } catch (e) {
        console.error('GoalsPage data fetch error:', e)
    }

    const mobileGoals: GoalItem[] = serializedGoals
        .filter((g) => g.status === 'ACTIVE')
        .map((g, i) => ({
            id: g.id,
            title: g.title,
            current: g.currentAmount,
            target: g.targetAmount,
            pct: Math.min(100, g.progressPercent),
            deadline: dateTr(g.targetDate),
            color: GOAL_ACCENTS[i % GOAL_ACCENTS.length],
        }))

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <GoalsMobile goals={mobileGoals} />
            </div>
            <div className="hidden lg:block">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Finansal Hedefler</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Borç kapatma, tasarruf ve birikim hedefleri belirle. İlerlemeni takip et.
                    </p>
                </header>
                <Suspense>
                    <GoalsWorkspace goals={serializedGoals} />
                </Suspense>
            </div>
        </PageShell>
    )
}
