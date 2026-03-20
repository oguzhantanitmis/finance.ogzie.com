import PageShell from '@/components/PageShell'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import DebtsWorkspace from '@/components/debts/DebtsWorkspace'

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
        return debts.map((debt) => ({
            ...debt,
            dueDate: debt.dueDate?.toISOString() ?? null,
            paymentPlan: debt.paymentPlan.map((plan) => ({
                ...plan,
                dueDate: plan.dueDate.toISOString(),
            })),
        }))
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
        <PageShell width="genis">
            <DebtsWorkspace debts={debts} />
        </PageShell>
    )
}
