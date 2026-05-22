import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport, formatDateForExport } from '@/lib/export/format'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const url = new URL(req.url)
        const format = (url.searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const summary = await getMonthlyBudgetSummary(user.id)

        const headers = ['Kalem', 'Tutar', 'Açıklama']
        const rows: (string | number)[][] = [
            ['Planlanan Gelir',    formatCurrencyForExport(summary.plannedIncome),    'Aylık gelir tahmini'],
            ['Sabit Yük',          formatCurrencyForExport(summary.fixedCommitments), 'Sabit gider + abonelik + sigorta'],
            ['Borç Baskısı',       formatCurrencyForExport(summary.debtCommitments),  'Bu ay borç ödemeleri'],
            ['Abonelik Yükü',      formatCurrencyForExport(summary.subscriptionLoad), 'Aylık abonelik etkisi'],
            ['Sabit Gider Yükü',   formatCurrencyForExport(summary.recurringLoad),    'Kira, fatura vb.'],
            ['Serbest Nakit',      formatCurrencyForExport(summary.freeCash),         'Hareket alanı'],
        ]

        if (format === 'csv') {
            return csvResponse({ slug: 'butce', headers, rows })
        }

        const obligationsTable = summary.upcomingObligations.length > 0
            ? [{
                title: 'Yaklaşan Yükümlülükler',
                headers: ['Adı', 'Tür', 'Tutar', 'Vade'],
                rows: summary.upcomingObligations.slice(0, 30).map(o => [
                    o.name,
                    o.category,
                    formatCurrencyForExport(o.amount, o.currency),
                    formatDateForExport(o.dueDate),
                ]),
                numericColumns: [2],
            }]
            : []

        return pdfResponse({
            slug: 'butce',
            title: 'Aylık Bütçe Raporu',
            subtitle: new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
            user: user.email,
            summary: [
                { label: 'Gelir',         value: formatCurrencyForExport(summary.plannedIncome),    tone: 'success' },
                { label: 'Sabit Yük',     value: formatCurrencyForExport(summary.fixedCommitments), tone: 'muted'   },
                { label: 'Borç Baskısı',  value: formatCurrencyForExport(summary.debtCommitments),  tone: 'danger'  },
                { label: 'Serbest Nakit', value: formatCurrencyForExport(summary.freeCash),         tone: summary.freeCash >= 0 ? 'success' : 'danger' },
            ],
            tables: [
                { title: 'Bütçe Kalemleri', headers, rows, numericColumns: [1] },
                ...obligationsTable,
            ],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
