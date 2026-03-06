import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import { prisma } from '@/lib/prisma'
import DebtTable from '@/components/DebtTable'
import DebtsClientWrapper from './DebtsClientWrapper'
import { getCurrentUser } from '@/lib/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getDebts(userId: string) {
    try {
        const debts = await prisma.debt.findMany({
            where: { userId },
            orderBy: { remainingBalance: 'desc' },
            include: {
                paymentPlan: {
                    orderBy: { installmentNo: 'asc' }
                }
            }
        })
        return debts
    } catch (error) {
        console.error("Error fetching debts:", error)
        return []
    }
}

export default async function DebtsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const debts = await getDebts(user.id)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Borç Yönetimi</h1>
                        <p className="text-zinc-500">Faiz, vergi ve maliyet analizi ile borçlarını yönet.</p>
                    </div>
                    <DebtsClientWrapper />
                </header>

                <DebtTable debts={debts} />
            </PageShell>
        </div>
    )
}
