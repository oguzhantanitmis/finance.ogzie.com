import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport } from '@/lib/export/format'
import { getMonthlyReports, getNetWorthHistory } from '@/lib/report-service'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const format = (new URL(req.url).searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'
        const months = Number(new URL(req.url).searchParams.get('months') ?? '6')

        const [monthly, netWorth] = await Promise.all([
            getMonthlyReports(user.id, months),
            getNetWorthHistory(user.id),
        ])

        const headers = ['Ay', 'Gelir', 'Gider', 'Net']
        const rows = monthly.map(m => [
            m.month,
            formatCurrencyForExport(m.income),
            formatCurrencyForExport(m.expense),
            formatCurrencyForExport(m.net),
        ])

        const totalIncome  = monthly.reduce((s, m) => s + m.income, 0)
        const totalExpense = monthly.reduce((s, m) => s + m.expense, 0)
        const totalNet     = totalIncome - totalExpense

        if (format === 'csv') {
            return csvResponse({ slug: 'raporlar', headers, rows })
        }

        const netWorthTable = netWorth.length > 0
            ? [{
                title: 'Net Değer Tarihçesi',
                headers: ['Tarih', 'Varlıklar', 'Borçlar', 'Net Değer', 'Sağlık'],
                rows: netWorth.slice(-12).map(s => [
                    new Date(s.date).toLocaleDateString('tr-TR'),
                    formatCurrencyForExport(s.totalAssets),
                    formatCurrencyForExport(s.totalDebts),
                    formatCurrencyForExport(s.netWorth),
                    String(s.score),
                ]),
                numericColumns: [1, 2, 3, 4],
            }]
            : []

        return pdfResponse({
            slug: 'raporlar',
            title: 'Finansal Rapor',
            subtitle: `Son ${months} ay`,
            user: user.email,
            summary: [
                { label: 'Toplam Gelir',  value: formatCurrencyForExport(totalIncome),  tone: 'success' },
                { label: 'Toplam Gider',  value: formatCurrencyForExport(totalExpense), tone: 'danger'  },
                { label: 'Net',           value: formatCurrencyForExport(totalNet),     tone: totalNet >= 0 ? 'success' : 'danger' },
                { label: 'Ay Sayısı',     value: String(monthly.length),                 tone: 'muted'   },
            ],
            tables: [
                { title: 'Aylık Özet', headers, rows, numericColumns: [1, 2, 3] },
                ...netWorthTable,
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
