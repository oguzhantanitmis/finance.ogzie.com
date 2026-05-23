import { redirect } from 'next/navigation'

import PageShell from '@/components/PageShell'
import DebtsWorkspace from '@/components/debts/DebtsWorkspace'
import ExportButton from '@/components/ui/ExportButton'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { isDbConnectionError, withDbRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'

import DebtsErrorState from './error-state'

export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    try {
        const { debts, people, paymentObligations } = await withDbRetry(
            () => getDebtWorkspaceData(user.id),
            { retries: 2, delayMs: 400 }
        )

        return (
            <PageShell width="genis">
                <div className="flex justify-end mb-4">
                    <ExportButton endpoint="/api/export/debts" label="Borçları İndir" />
                </div>
                <DebtsWorkspace debts={debts} people={people} paymentObligations={paymentObligations} />
            </PageShell>
        )
    } catch (err) {
        console.error('[/debts] Veri yüklenemedi:', err)
        return (
            <PageShell width="normal">
                <DebtsErrorState isConnectionError={isDbConnectionError(err)} />
            </PageShell>
        )
    }
}
