import { NextRequest } from 'next/server'

import { csvResponse } from '@/lib/export/csv'
import { pdfResponse } from '@/lib/export/pdf'
import { formatCurrencyForExport, formatNumberForExport } from '@/lib/export/format'
import { calculateAssetValue, getMarketRates } from '@/lib/market-data'
import { prisma } from '@/lib/prisma'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
    CASH:   'Nakit',
    BANK:   'Banka',
    GOLD:   'Altın',
    FX:     'Döviz',
    CRYPTO: 'Kripto',
    STOCK:  'Hisse',
    ESTATE: 'Gayrimenkul',
    OTHER:  'Diğer',
}

export async function GET(req: NextRequest) {
    try {
        const user = await requireCurrentUser()
        const format = (new URL(req.url).searchParams.get('format') ?? 'csv') as 'csv' | 'pdf'

        const [assets, rates] = await Promise.all([
            prisma.asset.findMany({ where: { userId: user.id }, orderBy: { amount: 'desc' } }),
            getMarketRates(user.id),
        ])

        const headers = ['Varlık', 'Tür', 'Miktar', 'Para Birimi', 'Birim Fiyat', 'TL Karşılığı']
        const rows = assets.map(a => {
            const tl = a.lastValue && a.lastValue > 0
                ? a.lastValue
                : calculateAssetValue(a.amount, a.type, a.currency, rates)
            return [
                a.name,
                TYPE_LABEL[a.type] ?? a.type,
                formatNumberForExport(a.amount, 4),
                a.currency,
                a.unitPrice ? formatCurrencyForExport(a.unitPrice, a.currency) : '-',
                formatCurrencyForExport(tl, 'TRY'),
            ]
        })

        const totalTL = assets.reduce((s, a) => {
            const tl = a.lastValue && a.lastValue > 0
                ? a.lastValue
                : calculateAssetValue(a.amount, a.type, a.currency, rates)
            return s + tl
        }, 0)

        if (format === 'csv') {
            return csvResponse({ slug: 'varliklar', headers, rows })
        }

        return pdfResponse({
            slug: 'varliklar',
            title: 'Varlık Listesi',
            subtitle: `${assets.length} varlık`,
            user: user.email,
            summary: [
                { label: 'Toplam Değer (TRY)', value: formatCurrencyForExport(totalTL), tone: 'success' },
                { label: 'Varlık Sayısı',       value: String(assets.length),            tone: 'default' },
                { label: 'Para Birimi',         value: String(new Set(assets.map(a => a.currency)).size), tone: 'muted' },
                { label: 'USD Kuru',            value: rates.USD ? formatCurrencyForExport(rates.USD) : '—', tone: 'muted' },
            ],
            tables: [{ headers, rows, numericColumns: [2, 4, 5] }],
        })
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Sunucu hatası'
        return new Response(JSON.stringify({ error: msg }), {
            status: msg === 'Unauthorized' ? 401 : 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
