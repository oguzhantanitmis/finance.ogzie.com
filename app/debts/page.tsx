import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import DebtsWorkspace from '@/components/debts/DebtsWorkspace'
import ExportButton from '@/components/ui/ExportButton'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const { debts, people, paymentObligations } = await getDebtWorkspaceData(user.id)

    return (
        <PageShell width="genis">
            <div className="flex justify-end mb-4">
                <ExportButton endpoint="/api/export/debts" label="Borçları İndir" />
            </div>
            <DebtsWorkspace debts={debts} people={people} paymentObligations={paymentObligations} />
        </PageShell>
    )
}
