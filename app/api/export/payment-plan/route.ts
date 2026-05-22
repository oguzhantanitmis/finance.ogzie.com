import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport, formatDateForExport } from '@/lib/export/format'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const format = (new URL(req.url).searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const data = await getDebtWorkspaceData(user.id)
        const obligations = data.paymentObligations

        const headers = ['Sıra', 'Kaynak', 'Tip', 'Tutar', 'Gecikme Günü', 'Gecikme Maliyeti', 'Vade', 'Not']
        const rows = obligations.map((o, i) => [
            String(i + 1),
            o.name,
            o.sourceLabel,
            formatCurrencyForExport(o.amount),
            o.overdueDays > 0 ? String(o.overdueDays) : '-',
            o.overdueCost > 0 ? formatCurrencyForExport(o.overdueCost) : '-',
            formatDateForExport(o.dueDate),
            o.note,
        ])

        const totalAmount = obligations.reduce((s, o) => s + o.amount, 0)
        const overdue     = obligations.filter(o => o.overdueDays > 0)
        const overdueCost = overdue.reduce((s, o) => s + o.overdueCost, 0)

        if (format === 'csv') {
            return csvResponse({ slug: 'odeme-plani', headers, rows })
        }

        return pdfResponse({
            slug: 'odeme-plani',
            title: 'Öncelikli Ödeme Planı',
            subtitle: `${obligations.length} ödeme yükümlülüğü`,
            user: user.email,
            summary: [
                { label: 'Toplam Tutar',      value: formatCurrencyForExport(totalAmount), tone: 'danger'  },
                { label: 'Gecikmiş',          value: String(overdue.length),                tone: overdue.length > 0 ? 'danger' : 'success' },
                { label: 'Gecikme Maliyeti',  value: formatCurrencyForExport(overdueCost), tone: 'danger'  },
                { label: 'Kayıt',             value: String(obligations.length),           tone: 'muted'   },
            ],
            tables: [{ headers, rows, numericColumns: [3, 4, 5] }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
