import { redirect } from 'next/navigation'

import ExportButton from '@/components/ui/ExportButton'
import PageShell from '@/components/PageShell'
import TransactionsWorkspace from '@/components/transactions/TransactionsWorkspace'
import { getAccounts } from '@/lib/account-service'
import { getLedgerEntries, getLedgerSummary } from '@/lib/ledger-service'
import { isDbConnectionError, withDbRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'

import TransactionsErrorBanner from './error-banner'

export const dynamic = 'force-dynamic'

function getSourceLink(entry: {
    accountId: string | null
    personId: string | null
    creditCardId: string | null
    debtId: string | null
    subscriptionId: string | null
}) {
    if (entry.creditCardId) {
        return { label: 'Kart kaydına git', href: `/cards/${entry.creditCardId}` }
    }

    if (entry.debtId) {
        return { label: 'Borç kaydına git', href: '/debts' }
    }

    if (entry.subscriptionId) {
        return { label: 'Abonelik kaydına git', href: '/subscriptions' }
    }

    if (entry.personId) {
        return { label: 'Kişi kaydına git', href: `/people/${entry.personId}` }
    }

    if (entry.accountId) {
        return { label: 'Hesap kaydına git', href: '/accounts' }
    }

    return null
}

export default async function TransactionsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let serializedEntries: Array<{
        id: string
        type: string
        amount: number
        currency: string
        description: string | null
        category: string | null
        date: string
        account: { name: string } | null
        sourceLabel: string | null
        sourceHref: string | null
    }> = []
    let totalIncome = 0
    let totalExpense = 0
    let total = 0
    let loadError: 'none' | 'connection' | 'unknown' = 'none'

    try {
        const [{ entries, total: t }, summary] = await withDbRetry(
            () => Promise.all([
                getLedgerEntries(user.id, undefined, 100),
                getLedgerSummary(user.id),
            ]),
            { retries: 2, delayMs: 400 }
        )
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
            sourceLabel: getSourceLink(e)?.label ?? null,
            sourceHref: getSourceLink(e)?.href ?? null,
        }))
    } catch (e) {
        console.error('TransactionsPage data fetch error:', e)
        loadError = isDbConnectionError(e) ? 'connection' : 'unknown'
    }

    // Hesap listesi
    let accounts: Array<{ id: string; name: string }> = []
    try {
        const accs = await getAccounts(user.id)
        accounts = accs.map((a) => ({ id: a.id, name: a.name }))
    } catch { /* devam */ }

    return (
        <PageShell width="genis">
            <header className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">İşlem Defteri</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Tüm finansal hareketlerin birleşik kaydı. Manuel gelir/gider ekle, tahsilat, ödeme, transfer ve kart ödeme hareketlerini takip et.
                    </p>
                </div>
                <ExportButton endpoint="/api/export/transactions" label="İşlemleri İndir" />
            </header>
            {loadError !== 'none' && <TransactionsErrorBanner kind={loadError} />}
            <TransactionsWorkspace
                entries={serializedEntries}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                total={total}
                accounts={accounts}
            />
        </PageShell>
    )
}
