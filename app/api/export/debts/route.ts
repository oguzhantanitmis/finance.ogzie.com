import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport, formatDateForExport, formatPercentForExport } from '@/lib/export/format'
import { getDebtWorkspaceData } from '@/lib/debt-views'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const SOURCE_LABEL: Record<string, string> = {
    DEBT:         'Banka Kredisi',
    CREDIT_CARD:  'Kredi Kartı',
    KMH_ACCOUNT:  'KMH',
    PERSONAL_RP:  'Şahsi Borç',
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const url = new URL(req.url)
        const format = (url.searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const data = await getDebtWorkspaceData(user.id)
        const debts = data.debts

        const headers = [
            'Borç Adı', 'Tür', 'Kaynak', 'Toplam Tutar', 'Kalan Bakiye',
            'Faiz Oranı', 'Vade', 'Taksit (Geçen/Toplam)', 'Asgari Ödeme',
        ]

        const rows = debts.map(d => [
            d.name,
            d.type,
            SOURCE_LABEL[d.sourceKind] ?? d.sourceKind,
            formatCurrencyForExport(d.totalBalance),
            formatCurrencyForExport(d.remainingBalance),
            formatPercentForExport(d.interestRate / 100),
            d.dueDate ? formatDateForExport(d.dueDate) : '-',
            d.installments
                ? `${(d.installments - (d.remainingInstallments ?? 0))}/${d.installments}`
                : '-',
            d.kmhMinimumPayment != null
                ? formatCurrencyForExport(d.kmhMinimumPayment)
                : formatCurrencyForExport(d.remainingBalance * d.minPaymentRate),
        ])

        const totalRemaining = debts.reduce((s, d) => s + d.remainingBalance, 0)
        const totalPrincipal = debts.reduce((s, d) => s + d.totalBalance, 0)
        const totalObligations = data.paymentObligations.reduce((s, o) => s + o.amount, 0)

        if (format === 'csv') {
            return csvResponse({
                slug: 'borclar',
                headers,
                rows,
            })
        }

        // PDF: borç tablosu + yaklaşan ödemeler alt tablosu
        const tables = [{
            title: 'Borç Listesi',
            headers,
            rows,
            numericColumns: [3, 4, 5, 8],
        }]

        if (data.paymentObligations.length > 0) {
            tables.push({
                title: 'Yaklaşan / Gecikmiş Ödemeler',
                headers: ['Borç', 'Tür', 'Tutar', 'Gecikme Maliyeti', 'Gecikme Günü', 'Vade'],
                rows: data.paymentObligations.map(o => [
                    o.name,
                    o.sourceLabel,
                    formatCurrencyForExport(o.amount),
                    o.overdueCost > 0 ? formatCurrencyForExport(o.overdueCost) : '-',
                    o.overdueDays > 0 ? String(o.overdueDays) : '-',
                    formatDateForExport(o.dueDate),
                ]),
                numericColumns: [2, 3, 4],
            })
        }

        return pdfResponse({
            slug: 'borclar',
            title: 'Borç Yönetim Raporu',
            subtitle: `${debts.length} aktif borç`,
            user: user.email,
            summary: [
                { label: 'Toplam Borç',         value: formatCurrencyForExport(totalRemaining),    tone: 'danger' },
                { label: 'Anapara',             value: formatCurrencyForExport(totalPrincipal),    tone: 'muted'  },
                { label: 'Yaklaşan Ödemeler',   value: formatCurrencyForExport(totalObligations),  tone: 'danger' },
                { label: 'Aktif Borç',          value: String(debts.length),                       tone: 'default' },
            ],
            tables,
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
