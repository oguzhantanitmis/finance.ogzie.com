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

        const people = await prisma.person.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' },
        })

        const records = await prisma.receivablePayable.findMany({
            where: {
                userId: user.id,
                status: { in: ['OPEN', 'PARTIAL', 'OVERDUE'] },
            },
            select: { personId: true, type: true, remainingAmount: true },
        })

        const peopleWithTotals = people.map(p => {
            const pRecords = records.filter(r => r.personId === p.id)
            const receivable = pRecords.filter(r => r.type === 'RECEIVABLE').reduce((s, r) => s + r.remainingAmount, 0)
            const payable    = pRecords.filter(r => r.type === 'PAYABLE').reduce((s, r) => s + r.remainingAmount, 0)
            return { ...p, openCount: pRecords.length, receivable, payable, net: receivable - payable }
        })

        const headers = ['Kişi', 'Telefon', 'Açık Kayıt', 'Alacak', 'Verecek', 'Net']
        const rows = peopleWithTotals.map(p => [
            p.name,
            p.phone ?? '-',
            String(p.openCount),
            formatCurrencyForExport(p.receivable),
            formatCurrencyForExport(p.payable),
            formatCurrencyForExport(p.net),
        ])

        const totalReceivable = peopleWithTotals.reduce((s, p) => s + p.receivable, 0)
        const totalPayable    = peopleWithTotals.reduce((s, p) => s + p.payable, 0)

        if (format === 'csv') {
            return csvResponse({ slug: 'kisiler', headers, rows })
        }

        return pdfResponse({
            slug: 'kisiler',
            title: 'Kişi Listesi',
            subtitle: `${people.length} kişi`,
            user: user.email,
            summary: [
                { label: 'Toplam Alacak', value: formatCurrencyForExport(totalReceivable), tone: 'success' },
                { label: 'Toplam Verecek', value: formatCurrencyForExport(totalPayable),    tone: 'danger'  },
                { label: 'Net Pozisyon',   value: formatCurrencyForExport(totalReceivable - totalPayable), tone: (totalReceivable - totalPayable) >= 0 ? 'success' : 'danger' },
                { label: 'Kişi Sayısı',    value: String(people.length),                   tone: 'default' },
            ],
            tables: [{ headers, rows, numericColumns: [2, 3, 4, 5] }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
