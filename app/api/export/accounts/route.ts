import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport } from '@/lib/export/format'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
    BANK_ACCOUNT:  'Banka Hesabı',
    CASH:          'Nakit',
    WALLET:        'Cüzdan',
    INVESTMENT:    'Yatırım',
    OTHER_ACCOUNT: 'Diğer',
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const format = (new URL(req.url).searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const accounts = await prisma.account.findMany({
            where: { userId: user.id },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        })

        const headers = ['Hesap', 'Tür', 'Banka', 'IBAN', 'Bakiye', 'Para Birimi', 'KMH']
        const rows = accounts.map(a => [
            a.name,
            TYPE_LABEL[a.type] ?? a.type,
            a.bankName ?? '-',
            a.iban ?? '-',
            formatCurrencyForExport(a.balance, a.currency),
            a.currency,
            a.hasKmh ? `Limit ${formatCurrencyForExport(a.kmhLimit ?? 0, a.currency)}` : '-',
        ])

        const totalBalance = accounts.reduce((s, a) => s + (a.currency === 'TRY' ? a.balance : 0), 0)
        const kmhCount = accounts.filter(a => a.hasKmh).length

        if (format === 'csv') {
            return csvResponse({ slug: 'hesaplar', headers, rows })
        }

        return pdfResponse({
            slug: 'hesaplar',
            title: 'Hesap Listesi',
            subtitle: `${accounts.length} hesap`,
            user: user.email,
            summary: [
                { label: 'Toplam Bakiye (TRY)', value: formatCurrencyForExport(totalBalance), tone: totalBalance >= 0 ? 'success' : 'danger' },
                { label: 'Hesap Sayısı',         value: String(accounts.length),               tone: 'default' },
                { label: 'KMH Aktif',            value: String(kmhCount),                       tone: kmhCount > 0 ? 'danger' : 'muted' },
                { label: 'Para Birimi',          value: String(new Set(accounts.map(a => a.currency)).size), tone: 'muted' },
            ],
            tables: [{ headers, rows, numericColumns: [4] }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
