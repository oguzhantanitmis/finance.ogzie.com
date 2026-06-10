import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import PageShell from '@/components/PageShell'
import AccountsWorkspace from '@/components/accounts/AccountsWorkspace'
import AccountsMobile, { type AccountItem } from '@/components/accounts/AccountsMobile'
import { syncCanonicalDebtsForUser } from '@/lib/canonical-debt-service'
import { getAccounts, getTotalBalance, getAvailableCash } from '@/lib/account-service'
import { prisma } from '@/lib/prisma'
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
        await syncCanonicalDebtsForUser(user.id)
        ;[accounts, totalBalance, availableCash] = await Promise.all([
            getAccounts(user.id),
            getTotalBalance(user.id),
            getAvailableCash(user.id),
        ])
        const kmhDebts = await prisma.debtAccount.findMany({
            where: {
                userId: user.id,
                sourceType: 'KMH',
                sourceEntityId: { in: accounts.map((account) => account.id) },
            },
            include: {
                obligations: {
                    where: { remainingAmount: { gt: 0 }, status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] } },
                    orderBy: { dueDate: 'asc' },
                },
            },
        })
        const kmhByAccountId = new Map(kmhDebts.map((debt) => [debt.sourceEntityId, debt]))
        accounts = accounts.map((account) => {
            const debt = kmhByAccountId.get(account.id)
            if (!debt) return account
            return {
                ...account,
                kmhStatementPrincipal: debt.principalBalance,
                kmhStatementInterest: Math.max(debt.statementBalance - debt.principalBalance, 0),
                kmhMinimumPayment: debt.obligations[0]?.remainingAmount ?? account.kmhMinimumPayment,
                kmhNextPaymentDate: debt.nextDueDate,
            }
        })
    } catch (e) {
        console.error('AccountsPage data fetch error:', e)
    }

    // Mobil eşleme: 'kmh' yalnız eksi bakiyede — mobil nakit başlığı getAvailableCash ile tutarlı kalır
    const mobileAccounts: AccountItem[] = accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.hasKmh && a.balance < 0 ? 'kmh'
            : a.type === 'CASH' || a.type === 'WALLET' ? 'cash'
            : 'bank',
        bank: a.bankName ?? (a.type === 'CASH' || a.type === 'WALLET' ? 'Nakit' : '—'),
        balance: a.balance,
        kmhLimit: a.kmhLimit ?? undefined,
    }))

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <AccountsMobile accounts={mobileAccounts} />
            </div>
            <div className="hidden lg:block">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Hesap Yönetimi</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Banka hesaplarını, nakit ve cüzdan bakiyelerini tek yerden yönet. Transfer yap, bakiye düzelt ve toplam durumunu izle.
                    </p>
                </header>

                <Suspense>
                    <AccountsWorkspace
                        initialAccounts={accounts}
                        totalBalance={totalBalance}
                        availableCash={availableCash}
                    />
                </Suspense>
            </div>
        </PageShell>
    )
}
