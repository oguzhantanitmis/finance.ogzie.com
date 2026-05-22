import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport } from '@/lib/export/format'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const format = (new URL(req.url).searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const cards = await prisma.creditCard.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                statements: { orderBy: { statementDate: 'desc' }, take: 1 },
            },
        })

        const headers = ['Kart', 'Banka', 'Limit', 'Mevcut Borç', 'Kullanım', 'Asgari Ödeme', 'Son Ödeme', 'Durum']
        const rows = cards.map(c => {
            const stmt = c.statements[0]
            const debt = c.currentDebt ?? 0
            const usage = c.totalLimit > 0 ? `%${((debt / c.totalLimit) * 100).toFixed(1)}` : '-'
            return [
                c.cardName ?? '-',
                c.bankName ?? '-',
                formatCurrencyForExport(c.totalLimit),
                formatCurrencyForExport(debt),
                usage,
                stmt?.minimumPayment != null ? formatCurrencyForExport(stmt.minimumPayment) : '-',
                stmt?.dueDate ? stmt.dueDate.toLocaleDateString('tr-TR') : '-',
                c.status,
            ]
        })

        const totalLimit = cards.reduce((s, c) => s + c.totalLimit, 0)
        const totalDebt  = cards.reduce((s, c) => s + (c.currentDebt ?? 0), 0)

        if (format === 'csv') {
            return csvResponse({ slug: 'kartlar', headers, rows })
        }

        return pdfResponse({
            slug: 'kartlar',
            title: 'Kredi Kartı Listesi',
            subtitle: `${cards.length} kart`,
            user: user.email,
            summary: [
                { label: 'Toplam Limit',        value: formatCurrencyForExport(totalLimit),               tone: 'default' },
                { label: 'Toplam Borç',         value: formatCurrencyForExport(totalDebt),                tone: 'danger'  },
                { label: 'Kullanılabilir',      value: formatCurrencyForExport(totalLimit - totalDebt),   tone: 'success' },
                { label: 'Kullanım Oranı',      value: totalLimit > 0 ? `%${((totalDebt / totalLimit) * 100).toFixed(1)}` : '0', tone: 'muted' },
            ],
            tables: [{ headers, rows, numericColumns: [2, 3, 5] }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
