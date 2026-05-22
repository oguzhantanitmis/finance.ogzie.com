import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport, formatDateForExport } from '@/lib/export/format'
import { getLedgerEntries } from '@/lib/ledger-service'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const LEDGER_TYPE_LABEL: Record<string, string> = {
    INCOME:               'Gelir',
    EXPENSE:              'Gider',
    SUBSCRIPTION_PAYMENT: 'Abonelik',
    RECURRING_PAYMENT:    'Sabit Gider',
    CARD_PAYMENT:         'Kart Ödemesi',
    TRANSFER:             'Transfer',
    ADJUSTMENT:           'Düzeltme',
    DEBT_PAYMENT:         'Borç Ödemesi',
    RECEIVABLE_COLLECTED: 'Tahsilat',
    PAYABLE_PAID:         'Verecek Ödeme',
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const url = new URL(req.url)
        const format = (url.searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'
        const from   = url.searchParams.get('from')
        const to     = url.searchParams.get('to')

        const filters = {
            startDate: from ? new Date(from) : undefined,
            endDate:   to   ? new Date(to)   : undefined,
        }
        const { entries } = await getLedgerEntries(user.id, filters, 10_000, 0)

        const headers = ['Tarih', 'Tür', 'Açıklama', 'Hesap', 'Para Birimi', 'Tutar']
        const rows = entries.map(e => [
            formatDateForExport(e.date),
            LEDGER_TYPE_LABEL[e.type] ?? e.type,
            e.description ?? '-',
            e.account?.name ?? '-',
            e.currency,
            (e.amount >= 0 ? '+' : '') + formatCurrencyForExport(e.amount, e.currency),
        ])

        const totalIncome  = entries.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0)
        const totalExpense = entries.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0)
        const net = totalIncome - totalExpense

        if (format === 'csv') {
            return csvResponse({
                slug: 'islemler',
                headers,
                rows,
            })
        }

        return pdfResponse({
            slug: 'islemler',
            title: 'İşlem Defteri',
            subtitle: `${entries.length} kayıt${from || to ? ` · ${from ?? 'başlangıç'} → ${to ?? 'bugün'}` : ''}`,
            user: user.email,
            summary: [
                { label: 'Toplam Gelir',  value: formatCurrencyForExport(totalIncome),  tone: 'success' },
                { label: 'Toplam Gider',  value: formatCurrencyForExport(totalExpense), tone: 'danger'  },
                { label: 'Net',           value: formatCurrencyForExport(net),          tone: net >= 0 ? 'success' : 'danger' },
                { label: 'Kayıt Sayısı',  value: String(entries.length),                 tone: 'muted' },
            ],
            tables: [{
                headers,
                rows,
                numericColumns: [5],
            }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
