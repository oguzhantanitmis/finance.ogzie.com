import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import AccountsWorkspace from '@/components/accounts/AccountsWorkspace'
import { getAccounts, getTotalBalance, getAvailableCash } from '@/lib/account-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    let accounts: Awaited<ReturnType<typeof getAccounts>> = []
    let totalBalance = 0
    let availableCash = 0

    try {
        ;[accounts, totalBalance, availableCash] = await Promise.all([
            getAccounts(user.id),
            getTotalBalance(user.id),
            getAvailableCash(user.id),
        ])
    } catch (e) {
        console.error('AccountsPage data fetch error:', e)
    }

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Hesap Yönetimi</h1>
                <p className="text-zinc-400 max-w-3xl">
                    Banka hesaplarını, nakit ve cüzdan bakiyelerini tek yerden yönet. Transfer yap, bakiye düzelt ve toplam durumunu izle.
                </p>
            </header>

            <AccountsWorkspace
                initialAccounts={accounts}
                totalBalance={totalBalance}
                availableCash={availableCash}
            />
        </PageShell>
    )
}
