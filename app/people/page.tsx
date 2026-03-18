import { redirect } from 'next/navigation'

import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import PeopleWorkspace from '@/components/people/PeopleWorkspace'
import { getPeople, getRPSummary } from '@/lib/people-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let people: Awaited<ReturnType<typeof getPeople>> = []
    let summary: { totalReceivable: number; totalPayable: number; net: number; overdueCount: number } = { totalReceivable: 0, totalPayable: 0, net: 0, overdueCount: 0 }

    try {
        ;[people, summary] = await Promise.all([
            getPeople(user.id),
            getRPSummary(user.id),
        ])
    } catch (e) {
        console.error('PeoplePage data fetch error:', e)
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Kişiler & Alacak / Verecek</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Kişi bazlı borç ve alacak takibi yap. Tahsilat girdiğinde hesap bakiyen otomatik güncellenir.
                    </p>
                </header>
                <PeopleWorkspace people={people} summary={summary} />
            </PageShell>
        </div>
    )
}
