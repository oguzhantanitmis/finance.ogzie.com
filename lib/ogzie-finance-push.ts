/**
 * ogzie finance sync — push helper (finance.ogzie.com → ogzie güvenli kanalı).
 *
 * Asimetrik Ed25519: bu uygulama ÖZEL anahtarla imzalar; ogzie yalnız PUBLIC
 * JWK'yı saklar ve doğrular. ogzie sır tutmaz → DB sızıntısı batch sahteleyemez.
 * Yalnız node:crypto + fetch kullanır (ek bağımlılık yok).
 *
 * Kanonik imza string'i (ogzie verifier ile BAYT-BAYT aynı):
 *   `ogzie-finance-sync:v1:${aud}:${timestamp}.${sha256hex(rawBody)}`
 * Header'lar: x-ogzie-timestamp: <unix sn> · x-ogzie-signature: v1=<base64url>
 *
 * Env:
 *   FINANCE_SYNC_PRIVATE_JWK  — Ed25519 PRIVATE JWK (ogzie connect/UI'dan)
 *   OGZIE_FINANCE_ENDPOINT    — https://app.ogzie.com/api/finance/sync
 *   OGZIE_FINANCE_AUDIENCE    — https://finance.ogzie.com
 */
import { createHash, createPrivateKey, sign as edSign, type KeyObject } from 'node:crypto'

const FINANCE_SIG_VERSION = 'v1'
const FINANCE_SIG_CONTEXT = 'ogzie-finance-sync:v1'
const FINANCE_SIG_HEADER = 'x-ogzie-signature'
const FINANCE_TS_HEADER = 'x-ogzie-timestamp'

export type FinanceKind = 'domain_cost' | 'client_fee' | 'payout' | 'adjustment'
export type FinanceDirection = 'in' | 'out'

export type FinanceEvent = {
    externalId: string
    kind: FinanceKind
    direction: FinanceDirection
    amountCents: number
    currency: string
    occurredOn: string // YYYY-MM-DD
    description?: string | null
    counterparty?: string | null
    status?: 'posted' | 'void'
    metadata?: Record<string, unknown> | null
}

export type FinanceSyncResult = {
    ok: boolean
    accepted: number
    duplicate: number
    rejected: number
    batchDuplicate?: boolean
    errors?: string[]
}

export type PushFinanceBatchResult = {
    ok: boolean
    status: number
    result?: FinanceSyncResult
    attempts: number
}

type Jwk = Record<string, unknown>

function signingBytes(aud: string, timestamp: string, rawBody: string): Buffer {
    const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
    return Buffer.from(`${FINANCE_SIG_CONTEXT}:${aud}:${timestamp}.${bodyHash}`, 'utf8')
}

function signFinanceRequest(
    privateJwk: Jwk | string,
    aud: string,
    timestamp: string,
    rawBody: string,
): string {
    const jwk = typeof privateJwk === 'string' ? (JSON.parse(privateJwk) as Jwk) : privateJwk
    const key: KeyObject = createPrivateKey({ key: jwk, format: 'jwk' })
    const sig = edSign(null, signingBytes(aud, timestamp, rawBody), key)
    return `${FINANCE_SIG_VERSION}=${sig.toString('base64url')}`
}

function isRetriable(status: number): boolean {
    return status === 408 || status === 429 || status >= 500
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Bir finans batch'ini imzalar ve ogzie'ye POST eder. Gövde BİR KEZ serialize
 * edilir; geçici hatada (ağ/408/429/5xx) TAZE timestamp + TAZE imza ile (aynı
 * batchId/aynı gövde) yeniden denenir — bayat timestamp ogzie'de reddedilir.
 * Idempotency sunucu-tarafında batchId + (source, externalId) ile garantilidir.
 */
export async function pushFinanceBatch(args: {
    endpoint: string
    aud: string
    privateJwk: Jwk | string
    batchId: string
    events: FinanceEvent[]
    maxAttempts?: number
    backoffBaseMs?: number
}): Promise<PushFinanceBatchResult> {
    const { endpoint, aud, privateJwk, batchId, events, maxAttempts = 3, backoffBaseMs = 500 } = args
    const rawBody = JSON.stringify({ aud, batchId, events })

    let lastStatus = 0
    let attempts = 0
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        attempts = attempt
        const timestamp = String(Math.floor(Date.now() / 1000))
        const signature = signFinanceRequest(privateJwk, aud, timestamp, rawBody)
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    [FINANCE_TS_HEADER]: timestamp,
                    [FINANCE_SIG_HEADER]: signature,
                },
                body: rawBody,
            })
            lastStatus = res.status
            const result = (await res.json().catch(() => undefined)) as FinanceSyncResult | undefined
            if (res.ok) return { ok: result?.ok ?? true, status: res.status, result, attempts }
            if (!isRetriable(res.status)) return { ok: false, status: res.status, result, attempts }
        } catch {
            lastStatus = lastStatus || 0
        }
        if (attempt < maxAttempts) await sleep(backoffBaseMs * attempt)
    }
    return { ok: false, status: lastStatus, attempts }
}
