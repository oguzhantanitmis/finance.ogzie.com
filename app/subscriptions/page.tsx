import { redirect } from 'next/navigation'

import Navbar from '@/components/Navbar'
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

            <main className="md:ml-72 p-6 md:p-10 max-w-7xl mx-auto">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finance OS</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Abonelik Yonetimi</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Hizli ekle ile servisleri yaz, sistem marka ve kategori tahmini yapsin, aylik etkisini otomatik olarak
                        planlayiciya islesin.
                    </p>
                </header>

                <SubscriptionWorkspace
                    subscriptions={summary.subscriptions.map((subscription) => ({
                        ...subscription,
                        nextPayment: subscription.nextPayment.toISOString(),
                    }))}
                />
            </main>
        </div>
    )
}
