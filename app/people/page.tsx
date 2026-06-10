import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import PageShell from '@/components/PageShell'
import PeopleWorkspace from '@/components/people/PeopleWorkspace'
import PeopleMobile, { type PersonItem } from '@/components/people/PeopleMobile'
import { relativeTr } from '@/lib/mobile-format'
import { getPeople, getRPSummary } from '@/lib/people-service'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function PeoplePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let people: Awaited<ReturnType<typeof getPeople>> = []
    let summary: { totalReceivable: number; totalPayable: number; net: number; overdueCount: number } = { totalReceivable: 0, totalPayable: 0, net: 0, overdueCount: 0 }
    let mobilePeople: PersonItem[] = []

    try {
        ;[people, summary] = await Promise.all([
            getPeople(user.id),
            getRPSummary(user.id),
        ])

        // Mobil ekran için kişi başına son hareket + taksit bilgisi
        const rps = await prisma.receivablePayable.findMany({
            where: { userId: user.id, status: { not: 'CLOSED' } },
            select: { personId: true, updatedAt: true, isInstallment: true, installmentCount: true },
        })
        const lastByPerson = new Map<string, Date>()
        const installmentsByPerson = new Map<string, number>()
        for (const rp of rps) {
            const prev = lastByPerson.get(rp.personId)
            if (!prev || rp.updatedAt > prev) lastByPerson.set(rp.personId, rp.updatedAt)
            if (rp.isInstallment && rp.installmentCount && !installmentsByPerson.has(rp.personId)) {
                installmentsByPerson.set(rp.personId, rp.installmentCount)
            }
        }

        mobilePeople = people.map((p) => {
            const installmentCount = installmentsByPerson.get(p.id)
            return {
                id: p.id,
                name: p.name,
                net: p.netPosition,
                owesYou: p.totalReceivable,
                youOwe: p.totalPayable,
                last: relativeTr(lastByPerson.get(p.id) ?? p.updatedAt),
                installments: installmentCount != null ? `${installmentCount} taksit` : undefined,
            }
        })
    } catch (e) {
        console.error('PeoplePage data fetch error:', e)
    }

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <PeopleMobile people={mobilePeople} />
            </div>
            <div className="hidden lg:block">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>Kişiler & Alacak / Verecek</h1>
                    <p className="max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
                        Kişi bazlı borç ve alacak takibi yap. Tahsilat girdiğinde hesap bakiyen otomatik güncellenir.
                    </p>
                </header>
                <Suspense>
                    <PeopleWorkspace people={people} summary={summary} />
                </Suspense>
            </div>
        </PageShell>
    )
}
