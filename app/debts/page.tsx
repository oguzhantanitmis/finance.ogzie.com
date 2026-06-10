import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import PageShell from '@/components/PageShell'
import DebtsWorkspace from '@/components/debts/DebtsWorkspace'
import DebtsMobile, { type DebtItem } from '@/components/debts/DebtsMobile'
import ExportButton from '@/components/ui/ExportButton'
import { getDebtWorkspaceData, type DebtView } from '@/lib/debt-views'
import { clampPct, daysUntil, daysUntilTr } from '@/lib/mobile-format'
import { isDbConnectionError, withDbRetry } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'

import DebtsErrorState from './error-state'

export const dynamic = 'force-dynamic'

function mapToDebtItems(debts: DebtView[]): DebtItem[] {
    return debts.map((v) => {
        const type: DebtItem['type'] =
            v.sourceKind === 'CREDIT_CARD' ? 'card'
            : v.sourceKind === 'KMH_ACCOUNT' ? 'kmh'
            : v.sourceKind === 'PERSONAL_RP' ? 'personal'
            : 'loan'

        const nextInstallment = v.paymentPlan?.find((p) => !p.isPaid)
        const monthly = nextInstallment?.amount
            ?? (type === 'card' ? Math.round(v.remainingBalance * (v.minPaymentRate || 0.20))
                : type === 'kmh' ? (v.kmhMinimumPayment ?? Math.round(v.remainingBalance * 0.05))
                : v.remainingBalance)

        let paidPct = 0
        if (type === 'card' || type === 'kmh') {
            paidPct = v.limit ? clampPct((1 - v.remainingBalance / v.limit) * 100) : 0
        } else if (v.totalPrincipal) {
            paidPct = clampPct((1 - v.remainingBalance / v.totalPrincipal) * 100)
        } else if (v.installments && v.remainingInstallments != null) {
            paidPct = clampPct(((v.installments - v.remainingInstallments) / v.installments) * 100)
        }

        return {
            id: v.id,
            name: v.name,
            type,
            bank: v.subtitle ?? '—',
            remaining: v.remainingBalance,
            monthly,
            nextDue: daysUntilTr(v.dueDate ?? nextInstallment?.dueDate),
            rate: v.interestRate > 0 ? +v.interestRate.toFixed(2) : undefined,
            paidPct,
            critical: v.dueDate != null && (daysUntil(v.dueDate) ?? 99) <= 1,
        }
    })
}

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
                <div className="lg:hidden">
                    <DebtsMobile debts={mapToDebtItems(debts)} />
                </div>
                <div className="hidden lg:block">
                    <div className="flex justify-end mb-4">
                        <ExportButton endpoint="/api/export/debts" label="Borçları İndir" />
                    </div>
                    <Suspense>
                        <DebtsWorkspace debts={debts} people={people} paymentObligations={paymentObligations} />
                    </Suspense>
                </div>
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
