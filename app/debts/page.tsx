import PageShell from '@/components/PageShell'
import DebtsWorkspace from '@/components/debts/DebtsWorkspace'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { getCurrentUser } from '@/lib/server-auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const { debts, people } = await getDebtWorkspaceData(user.id)

    return (
        <PageShell width="genis">
            <DebtsWorkspace debts={debts} people={people} />
        </PageShell>
    )
}
