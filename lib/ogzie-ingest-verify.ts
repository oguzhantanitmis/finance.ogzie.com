/**
 * ogzie → finance push ingest — imza doğrulama (asimetrik Ed25519).
 *
 * ogzie ÖZEL anahtarla imzalar; finance yalnız PUBLIC JWK saklar ve doğrular.
 * finance sır tutmaz → DB sızıntısı batch sahteleyemez. Yalnız node:crypto.
 *
 * Kanonik imza string'i (ogzie gönderici ile BAYT-BAYT aynı):
 *   `ogzie-finance-push:v1:${aud}:${timestamp}.${sha256hex(rawBody)}`
 *
 * Header'lar:
 *   x-ogzie-timestamp: <unix sn>
 *   x-ogzie-signature: v1=<base64url(sig)>
 *
 * Kanonik-JSON YOK: gönderici gönderdiği string'i hash'ler, alıcı `req.text()`
 * ile aldığı ham string'i hash'ler → JSON key sırası önemsiz.
 */
import { createHash, createPublicKey, verify as edVerify, type KeyObject } from 'node:crypto'

const SIG_VERSION = 'v1'
const SIG_CONTEXT = 'ogzie-finance-push:v1'

// Timestamp tazelik penceresi (saniye) — saat kayması + ağ gecikmesi toleransı.
const TIMESTAMP_TOLERANCE_SECONDS = 300

export type VerifyResult = { ok: true } | { ok: false; reason: string }
type PublicJwkInput = string | Record<string, unknown>
type VerifyOptions = {
    aud: string
    now?: number
} & (
    | { publicJwk: PublicJwkInput; publicJwks?: never }
    | { publicJwk?: never; publicJwks: readonly PublicJwkInput[] }
)

/**
 * İmza için karşılaştırılan kanonik string. ham gövde string'i sha256 hex
 * (küçük harf) hash'lenir, context + audience + timestamp ile birleştirilir.
 */
export function signingInput(aud: string, timestamp: string, bodyHash: string): string {
    return `${SIG_CONTEXT}:${aud}:${timestamp}.${bodyHash}`
}

/** Ham gövde string'inin sha256 hex (küçük harf) özeti. */
function hashBody(rawBody: string): string {
    return createHash('sha256').update(rawBody, 'utf8').digest('hex')
}

/** "v1=<base64url>" header'ından imza baytlarını savunmacı parse eder. */
function parseSignatureHeader(header: string | null | undefined): Buffer | null {
    if (typeof header !== 'string' || header.length === 0) return null
    const eq = header.indexOf('=')
    if (eq <= 0) return null
    const version = header.slice(0, eq)
    const value = header.slice(eq + 1)
    if (version !== SIG_VERSION || value.length === 0) return null
    try {
        const buf = Buffer.from(value, 'base64url')
        // base64url decode sessizce boş/yanlış üretebilir → boş ise reddet.
        if (buf.length === 0) return null
        return buf
    } catch {
        return null
    }
}

/** Unix-saniye timestamp header'ını parse eder (yalnız tamsayı). */
function parseTimestamp(header: string | null | undefined): number | null {
    if (typeof header !== 'string' || header.length === 0) return null
    if (!/^\d{1,15}$/.test(header.trim())) return null
    const ts = Number.parseInt(header.trim(), 10)
    return Number.isFinite(ts) ? ts : null
}

/** Yalnız public Ed25519 JWK kabul eder; private `d` alanını kesin olarak reddeder. */
function publicEd25519Key(input: PublicJwkInput): KeyObject | null {
    try {
        const jwk: unknown = typeof input === 'string' ? JSON.parse(input) : input
        if (!jwk || typeof jwk !== 'object' || Array.isArray(jwk)) return null

        const candidate = jwk as Record<string, unknown>
        if (
            candidate.kty !== 'OKP' ||
            candidate.crv !== 'Ed25519' ||
            typeof candidate.x !== 'string' ||
            !/^[A-Za-z0-9_-]{43}$/.test(candidate.x) ||
            Object.hasOwn(candidate, 'd')
        ) return null

        const publicBytes = Buffer.from(candidate.x, 'base64url')
        if (publicBytes.length !== 32 || publicBytes.toString('base64url') !== candidate.x) return null
        if (candidate.alg !== undefined && candidate.alg !== 'EdDSA') return null
        if (candidate.use !== undefined && candidate.use !== 'sig') return null
        if (candidate.key_ops !== undefined) {
            if (
                !Array.isArray(candidate.key_ops) ||
                !candidate.key_ops.includes('verify') ||
                candidate.key_ops.some((operation) => operation !== 'verify')
            ) return null
        }

        return createPublicKey({ key: candidate, format: 'jwk' })
    } catch {
        return null
    }
}

/**
 * ogzie push isteğini doğrular.
 *
 * @param rawBody    `req.text()` ile alınan HAM gövde string'i (parse edilmemiş).
 * @param tsHeader   x-ogzie-timestamp header değeri.
 * @param sigHeader  x-ogzie-signature header değeri ("v1=...").
 * @param opts.aud   beklenen audience (= finance origin).
 * @param opts.publicJwk  Tek Ed25519 PUBLIC JWK (string ya da obje).
 * @param opts.publicJwks En fazla iki Ed25519 PUBLIC JWK; herhangi biri doğrulayabilir.
 * @param opts.now   (test) referans zaman; varsayılan Date.now().
 */
export function verifyOgziePush(
    rawBody: string,
    tsHeader: string | null | undefined,
    sigHeader: string | null | undefined,
    opts: VerifyOptions,
): VerifyResult {
    const { aud } = opts

    const timestamp = parseTimestamp(tsHeader)
    if (timestamp === null) return { ok: false, reason: 'bad_timestamp' }

    const signature = parseSignatureHeader(sigHeader)
    if (signature === null) return { ok: false, reason: 'bad_signature_header' }

    // Tazelik: ±tolerans penceresi dışındaki istekleri reddet (replay/bayat).
    const nowSec = Math.floor((opts.now ?? Date.now()) / 1000)
    if (Math.abs(nowSec - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
        return { ok: false, reason: 'stale_timestamp' }
    }

    const bodyHash = hashBody(rawBody)
    const input = Buffer.from(signingInput(aud, String(timestamp), bodyHash), 'utf8')
    const publicJwks = opts.publicJwks ?? [opts.publicJwk]
    if (publicJwks.length > 2) return { ok: false, reason: 'too_many_public_keys' }

    let usableKeyCount = 0
    let verifyErrorCount = 0
    for (const publicJwk of publicJwks) {
        const key = publicEd25519Key(publicJwk)
        if (!key) continue
        usableKeyCount += 1
        try {
            if (edVerify(null, input, key, signature)) return { ok: true }
        } catch {
            verifyErrorCount += 1
        }
    }

    if (usableKeyCount === 0) return { ok: false, reason: 'bad_public_key' }
    if (verifyErrorCount === usableKeyCount) return { ok: false, reason: 'verify_error' }
    return { ok: false, reason: 'invalid_signature' }
}
