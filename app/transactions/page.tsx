import { redirect } from 'next/navigation'

import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import TransactionsWorkspace from '@/components/transactions/TransactionsWorkspace'
import { getLedgerEntries, getLedgerSummary } from '@/lib/ledger-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [{ entries, total }, summary] = await Promise.all([
        getLedgerEntries(user.id, undefined, 100),
        getLedgerSummary(user.id),
    ])

    const serializedEntries = entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        currency: e.currency,
        description: e.description,
        category: e.category,
        date: e.date.toISOString(),
        account: e.account ? { name: e.account.name } : null,
    }))

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">İşlem Defteri</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Tüm finansal hareketlerin birleşik kaydı. Tahsilat, ödeme, transfer, kart ödeme — tek yerde.
                    </p>
                </header>
                <TransactionsWorkspace
                    entries={serializedEntries}
                    totalIncome={summary.totalIncome}
                    totalExpense={summary.totalExpense}
                    total={total}
                />
            </PageShell>
        </div>
    )
}
