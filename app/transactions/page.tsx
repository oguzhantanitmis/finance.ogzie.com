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

    let serializedEntries: Array<{ id: string; type: string; amount: number; currency: string; description: string | null; category: string | null; date: string; account: { name: string } | null }> = []
    let totalIncome = 0
    let totalExpense = 0
    let total = 0

    try {
        const [{ entries, total: t }, summary] = await Promise.all([
            getLedgerEntries(user.id, undefined, 100),
            getLedgerSummary(user.id),
        ])
        total = t
        totalIncome = summary.totalIncome
        totalExpense = summary.totalExpense
        serializedEntries = entries.map((e) => ({
            id: e.id,
            type: e.type,
            amount: e.amount,
            currency: e.currency,
            description: e.description,
            category: e.category,
            date: e.date.toISOString(),
            account: e.account ? { name: e.account.name } : null,
        }))
    } catch (e) {
        console.error('TransactionsPage data fetch error:', e)
    }

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
                    totalIncome={totalIncome}
                    totalExpense={totalExpense}
                    total={total}
                />
            </PageShell>
        </div>
    )
}
