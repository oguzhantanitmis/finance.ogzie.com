import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

import { prisma } from '@/lib/prisma'
import { pushFinanceBatch, type FinanceEvent, type FinanceDirection, type FinanceKind } from '@/lib/ogzie-finance-push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ogzie güvenli kanalına finansal hareketleri push eder. LedgerEntry (birleşik
 * defter) = gerçek para hareketlerinin kaynağı. Cron/owner tetikler; ogzie
 * idempotent yazar (externalId = ledgerEntry.id).
 *
 * Auth: `Authorization: Bearer <OGZIE_SYNC_SECRET>` (sabit-zaman karşılaştırma).
 * Tetikleme: Dokploy schedule → `curl -XPOST -H "authorization: Bearer $OGZIE_SYNC_SECRET" .../api/ogzie-sync`
 */

// LedgerEntryType → (yön, ogzie kind). Yalnız NAKİT hareketleri; muhasebe-içi
// (TRANSFER/BALANCE_ADJUSTMENT/DEBT_ADDITION/RECEIVABLE_ADDITION) atlanır.
const TYPE_MAP: Record<string, { dir: FinanceDirection; kind: FinanceKind }> = {
    INCOME: { dir: 'in', kind: 'client_fee' },
    COLLECTION: { dir: 'in', kind: 'client_fee' },
    EXPENSE: { dir: 'out', kind: 'domain_cost' },
    PAYMENT_TO_PERSON: { dir: 'out', kind: 'payout' },
    SUBSCRIPTION_PAYMENT: { dir: 'out', kind: 'domain_cost' },
    CARD_PAYMENT: { dir: 'out', kind: 'adjustment' },
    DEBT_PAYMENT: { dir: 'out', kind: 'payout' },
}

const DOMAIN_RE = /domain|alan ad|hosting|ssl|registrar|godaddy|namecheap|cloudflare/i

function bearerOk(header: string | null): boolean {
    const secret = process.env.OGZIE_SYNC_SECRET ?? ''
    if (!secret || !header) return false
    const expected = `Bearer ${secret}`
    const a = Buffer.from(header)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
}

function toEvent(e: {
    id: string
    type: string
    amount: number
    currency: string | null
    description: string | null
    category: string | null
    date: Date
}): FinanceEvent | null {
    const m = TYPE_MAP[e.type]
    if (!m) return null
    const cents = Math.round(Math.abs(e.amount) * 100)
    if (!Number.isFinite(cents) || cents <= 0) return null
    const text = `${e.category ?? ''} ${e.description ?? ''}`
    // domain_cost varsayılanını rafine et: domain-ilişkili değilse genel gider → adjustment
    let kind = m.kind
    if (kind === 'domain_cost' && !DOMAIN_RE.test(text)) kind = 'adjustment'
    return {
        externalId: e.id,
        kind,
        direction: m.dir,
        amountCents: Math.min(cents, 2_147_483_647),
        currency: (e.currency ?? 'TRY').toUpperCase(),
        occurredOn: e.date.toISOString().slice(0, 10),
        description: e.description ?? e.category ?? null,
        metadata: { ledgerType: e.type },
    }
}

export async function POST(req: Request) {
    if (!bearerOk(req.headers.get('authorization'))) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const endpoint = process.env.OGZIE_FINANCE_ENDPOINT
    const aud = process.env.OGZIE_FINANCE_AUDIENCE
    const privateJwk = process.env.FINANCE_SYNC_PRIVATE_JWK
    if (!endpoint || !aud || !privateJwk) {
        return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
    }

    // Son hareketler (en yeni 1000). ogzie externalId ile dedup eder → tekrar push güvenli.
    const rows = await prisma.ledgerEntry.findMany({
        orderBy: { date: 'desc' },
        take: 1000,
        select: { id: true, type: true, amount: true, currency: true, description: true, category: true, date: true },
    })

    const events: FinanceEvent[] = []
    for (const r of rows) {
        const ev = toEvent(r)
        if (ev) events.push(ev)
    }

    if (events.length === 0) {
        return NextResponse.json({ ok: true, pushed: 0, note: 'gönderilecek nakit hareketi yok' })
    }

    // ogzie batch sınırı 500 → parçala.
    const chunks: FinanceEvent[][] = []
    for (let i = 0; i < events.length; i += 500) chunks.push(events.slice(i, i + 500))

    const results = []
    let accepted = 0
    let duplicate = 0
    for (let i = 0; i < chunks.length; i++) {
        const r = await pushFinanceBatch({
            endpoint,
            aud,
            privateJwk,
            batchId: `ledger-${Date.now()}-${i}`,
            events: chunks[i],
        })
        accepted += r.result?.accepted ?? 0
        duplicate += r.result?.duplicate ?? 0
        results.push({ status: r.status, ok: r.ok, accepted: r.result?.accepted, duplicate: r.result?.duplicate })
    }

    return NextResponse.json({ ok: results.every((r) => r.ok), pushed: events.length, accepted, duplicate, chunks: results })
}
