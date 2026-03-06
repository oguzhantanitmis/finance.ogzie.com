import { redirect } from 'next/navigation'

import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'

import SubscriptionWorkspace from './SubscriptionWorkspace'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />

            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Abonelik yönetimi</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Hızlı ekle ile servisleri yaz, sistem marka ve kategori tahmini yapsın, aylık etkisini otomatik olarak
                        planlayıcıya işlesin.
                    </p>
                </header>

                <SubscriptionWorkspace
                    subscriptions={summary.subscriptions.map((subscription) => ({
                        ...subscription,
                        nextPayment: subscription.nextPayment.toISOString(),
                    }))}
                />
            </PageShell>
        </div>
    )
}
