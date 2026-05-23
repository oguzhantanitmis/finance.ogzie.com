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

    let debts: Awaited<ReturnType<typeof getDebtWorkspaceData>>['debts'] = []
    let people: Awaited<ReturnType<typeof getDebtWorkspaceData>>['people'] = []
    let paymentObligations: Awaited<ReturnType<typeof getDebtWorkspaceData>>['paymentObligations'] = []

    try {
        const data = await getDebtWorkspaceData(user.id)
        debts = data.debts
        people = data.people
        paymentObligations = data.paymentObligations
    } catch (err) {
        // Detaylı log — production runtime'da Vercel logs'a yansır
        const e = err as { message?: string; code?: string; meta?: unknown; stack?: string; name?: string }
        console.error('🔴 [/debts] getDebtWorkspaceData FAILED:', {
            userId: user.id,
            name: e?.name,
            code: e?.code,
            message: e?.message,
            meta: e?.meta,
            stack: e?.stack?.split('\n').slice(0, 5).join(' | '),
        })
        // Re-throw → ErrorBoundary devreye girer, ama log artık tam
        throw err
    }

    return (
        <PageShell width="genis">
            <div className="flex justify-end mb-4">
                <ExportButton endpoint="/api/export/debts" label="Borçları İndir" />
            </div>
            <DebtsWorkspace debts={debts} people={people} paymentObligations={paymentObligations} />
        </PageShell>
    )
}
