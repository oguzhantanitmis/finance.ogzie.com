import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import PersonDetailWorkspace from '@/components/people/PersonDetailWorkspace'
import { getPersonDetail } from '@/lib/people-service'
import { getAccounts } from '@/lib/account-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const { id } = await params

    let person
    try {
        person = await getPersonDetail(id)
    } catch {
        notFound()
    }

    if (person.userId !== user.id) notFound()

    const accounts = await getAccounts(user.id)

    // Serialize dates for client component
    const serializedPerson = {
        id: person.id,
        name: person.name,
        phone: person.phone,
        email: person.email,
        notes: person.notes,
        receivablesPayables: person.receivablesPayables.map((rp) => ({
            id: rp.id,
            type: rp.type,
            description: rp.description,
            originalAmount: rp.originalAmount,
            remainingAmount: rp.remainingAmount,
            currency: rp.currency,
            dueDate: rp.dueDate?.toISOString() ?? null,
            status: rp.status,
            createdAt: rp.createdAt.toISOString(),
            transactions: rp.transactions.map((tx) => ({
                id: tx.id,
                amount: tx.amount,
                transactionDate: tx.transactionDate.toISOString(),
                description: tx.description,
                account: tx.account ? { name: tx.account.name } : null,
            })),
        })),
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <Link href="/people" className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Kişilere Dön
                    </Link>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Kişi detayı</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{person.name}</h1>
                </header>
                <PersonDetailWorkspace person={serializedPerson} accounts={accounts} />
            </PageShell>
        </div>
    )
}
