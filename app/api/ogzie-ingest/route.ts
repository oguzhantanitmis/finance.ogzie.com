import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { calculateAssetValue, getMarketRates } from '@/lib/market-data'
import { verifyOgziePush } from '@/lib/ogzie-ingest-verify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ogzie → finance push ingest. ogzie domain/hizmet yenileme tahminlerini
 * (forecast) ve gerçekleşmelerini (actual) imzalı batch olarak gönderir;
 * finance bunları LedgerEntry'ye effectively-once yazar.
 *
 * Güvenlik: asimetrik Ed25519 (PUBLIC JWK ile doğrulanır, sır tutulmaz).
 * Idempotency: batch düzeyi OgzieIngestBatch.batchId UNIQUE + satır düzeyi
 *   LedgerEntry (source, externalId) UNIQUE (createMany skipDuplicates).
 */

type FinanceEvent = {
    externalId: string
    assetType: 'domain' | 'service'
    assetId: string
    mode: 'forecast' | 'actual'
    direction: 'in' | 'out'
    amountCents: number
    currency: string
    occurredOn: string // YYYY-MM-DD
    periodKey: string // YYYY-MM-DD
    description: string
    counterparty: string | null
}

type IngestBody = {
    aud: string
    batchId: string
    events: FinanceEvent[]
}

/** Tek batch'te kabul edilen azami event sayısı (imzalı-ama-devasa gövde DoS sınırı). */
const MAX_EVENTS = 1000

/** createMany chunk boyutu (MySQL placeholder / lock süresi sınırı). */
const CHUNK = 500

/** TRY-dışı desteklenen para birimleri (getMarketRates/calculateAssetValue kuru var). */
const SUPPORTED_FX = new Set(['USD', 'EUR', 'GBP', 'XAU', 'GA'])

function isFiniteNumber(n: unknown): n is number {
    return typeof n === 'number' && Number.isFinite(n)
}

/** ogzie assetType + direction → LedgerEntryType eşlemesi. */
function mapLedgerType(assetType: string, direction: string): 'EXPENSE' | 'COLLECTION' | null {
    if (assetType === 'domain') return 'EXPENSE'
    if (assetType === 'service' && direction === 'in') return 'COLLECTION'
    if (direction === 'out') return 'EXPENSE'
    return null
}

export async function POST(req: Request) {
    // 1) HAM gövde — imza bu string üzerinden doğrulanır (kanonik-JSON yok).
    const rawBody = await req.text()
    const tsHeader = req.headers.get('x-ogzie-timestamp')
    const sigHeader = req.headers.get('x-ogzie-signature')

    const aud = process.env.OGZIE_FINANCE_PUSH_AUDIENCE
    const publicJwk = process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK
    if (!aud || !publicJwk) {
        return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
    }

    // 2) İmza + tazelik doğrulaması.
    const verdict = verifyOgziePush(rawBody, tsHeader, sigHeader, { aud, publicJwk })
    if (!verdict.ok) {
        return NextResponse.json({ ok: false, error: 'unauthorized', reason: verdict.reason }, { status: 401 })
    }

    // 3) Gövdeyi parse et (imza zaten geçti).
    let body: IngestBody
    try {
        body = JSON.parse(rawBody) as IngestBody
    } catch {
        return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }

    // 4) audience gövdede de eşleşmeli (header imzası + gövde alanı tutarlılığı).
    if (body?.aud !== aud) {
        return NextResponse.json({ ok: false, error: 'audience_mismatch' }, { status: 400 })
    }
    if (typeof body.batchId !== 'string' || body.batchId.length === 0 || !Array.isArray(body.events)) {
        return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
    }
    if (body.events.length > MAX_EVENTS) {
        return NextResponse.json({ ok: false, error: 'too_many_events' }, { status: 413 })
    }

    const ingestUserId = process.env.OGZIE_INGEST_USER_ID
    if (!ingestUserId) {
        return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 500 })
    }

    // 5) Batch düzeyi effectively-once: aynı batchId tekrar gelirse no-op.
    try {
        await prisma.ogzieIngestBatch.create({ data: { batchId: body.batchId } })
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return NextResponse.json({ ok: true, batchDuplicate: true })
        }
        throw err
    }

    // 6) Kurları BİR KEZ çek (TRY dönüşümü için).
    const rates = await getMarketRates(ingestUserId)
    const rateDateIso = rates.rateDate ? rates.rateDate.toISOString() : null

    // 7) Her event'i normalize et → LedgerEntry satırı.
    type LedgerRow = Prisma.LedgerEntryCreateManyInput
    const data: LedgerRow[] = []
    let rejected = 0

    for (const ev of body.events) {
        if (!ev || typeof ev !== 'object') {
            rejected++
            continue
        }
        const type = mapLedgerType(ev.assetType, ev.direction)
        if (!type) {
            rejected++
            continue
        }
        if (!isFiniteNumber(ev.amountCents) || ev.amountCents <= 0) {
            rejected++
            continue
        }
        if (typeof ev.occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ev.occurredOn)) {
            rejected++
            continue
        }

        const amount = ev.amountCents / 100
        const currency = (ev.currency ?? 'TRY').toUpperCase()

        // TRY'ye çevir. TRY zaten TRY; aksi halde piyasa kuruyla.
        let amountTRY: number
        let rateUsed: number
        if (currency === 'TRY') {
            amountTRY = amount
            rateUsed = 1
        } else if (!SUPPORTED_FX.has(currency)) {
            // Desteklenmeyen para birimi: calculateAssetValue 1:1 döndürür (rateUsed≈1
            // sıfır-kontrolünü geçer) → sessiz YANLIŞ TRY tutarı. Yazmaktansa REDDET.
            rejected++
            continue
        } else {
            amountTRY = calculateAssetValue(amount, 'FIAT', currency, rates)
            // Uygulanan kuru türet (sıfır/NaN kuru yakalamak için).
            rateUsed = amount !== 0 ? amountTRY / amount : 0
        }

        // Kur geçersiz/sıfır → bu event'i REDDET (yanlış TRY tutarı yazma).
        if (!isFiniteNumber(amountTRY) || amountTRY <= 0 || !isFiniteNumber(rateUsed) || rateUsed <= 0) {
            rejected++
            continue
        }

        data.push({
            userId: ingestUserId,
            source: 'ogzie', // GÖVDEDEN DEĞİL — route'ta sabit enjekte.
            externalId: ev.externalId,
            type,
            amount: amountTRY,
            currency: 'TRY',
            date: new Date(`${ev.occurredOn}T00:00:00.000Z`),
            description: ev.description,
            category: ev.assetType === 'domain' ? 'Domain' : 'Hizmet',
            metadata: {
                ogzie: true,
                mode: ev.mode,
                direction: ev.direction,
                assetType: ev.assetType,
                assetId: ev.assetId,
                periodKey: ev.periodKey,
                originalAmountCents: ev.amountCents,
                originalCurrency: currency,
                rateUsed,
                rateDate: rateDateIso,
                counterparty: ev.counterparty ?? null,
            } satisfies Prisma.InputJsonValue,
        })
    }

    // 8) Toplu yaz — (source, externalId) UNIQUE ile satır-düzeyi idempotency.
    let accepted = 0
    for (let i = 0; i < data.length; i += CHUNK) {
        const result = await prisma.ledgerEntry.createMany({
            data: data.slice(i, i + CHUNK),
            skipDuplicates: true,
        })
        accepted += result.count
    }

    return NextResponse.json({
        ok: true,
        accepted,
        duplicateOrRejected: data.length - accepted,
        rejected,
    })
}
