import Navbar from '@/components/Navbar'
import { addDebt } from '@/app/actions' // Server Action remains the same
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import DebtTable from '@/components/DebtTable'
import DebtsClientWrapper from './DebtsClientWrapper' // We'll need a wrapper for client-side modal state if we want to keep server fetching clean

export const dynamic = 'force-dynamic'

async function getDebts() {
    try {
        const debts = await prisma.debt.findMany({
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
    const debts = await getDebts()

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <main className="md:ml-64 p-6 md:p-10 max-w-[1600px] mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Borç Yönetimi</h1>
                        <p className="text-zinc-500">Faiz, vergi ve maliyet analizi ile borçlarını yönet.</p>
                    </div>
                    <DebtsClientWrapper />
                </header>

                <DebtTable debts={debts} />
            </main>
        </div>
    )
}
