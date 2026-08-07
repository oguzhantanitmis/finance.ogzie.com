import { describe, it, expect, beforeAll } from 'vitest'
import {
    createHash,
    createPrivateKey,
    generateKeyPairSync,
    sign as edSign,
    type JsonWebKey,
    type KeyObject,
} from 'node:crypto'

import { signingInput, verifyOgziePush } from '@/lib/ogzie-ingest-verify'

const AUD = 'https://finance.ogzie.com'

// Sabit Ed25519 çifti — private ile imzala, public JWK ile doğrula (round-trip).
let privateKey: KeyObject
let publicJwk: JsonWebKey
let privateJwk: JsonWebKey
let secondaryPrivateKey: KeyObject
let secondaryPublicJwk: JsonWebKey

beforeAll(() => {
    const { privateKey: priv, publicKey: pub } = generateKeyPairSync('ed25519')
    privateKey = priv
    publicJwk = pub.export({ format: 'jwk' })
    privateJwk = priv.export({ format: 'jwk' })
    const secondary = generateKeyPairSync('ed25519')
    secondaryPrivateKey = secondary.privateKey
    secondaryPublicJwk = secondary.publicKey.export({ format: 'jwk' })
})

/** Gönderici tarafıyla aynı imzayı üretir (ham gövde string'i üzerinden). */
function sign(rawBody: string, timestamp: string, aud = AUD): string {
    const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
    const input = Buffer.from(signingInput(aud, timestamp, bodyHash), 'utf8')
    const sig = edSign(null, input, privateKey)
    return `v1=${sig.toString('base64url')}`
}

function signWith(rawBody: string, timestamp: string, key: KeyObject): string {
    const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
    const input = Buffer.from(signingInput(AUD, timestamp, bodyHash), 'utf8')
    return `v1=${edSign(null, input, key).toString('base64url')}`
}

function nowTs(): string {
    return String(Math.floor(Date.now() / 1000))
}

describe('verifyOgziePush', () => {
    const rawBody = JSON.stringify({
        aud: AUD,
        batchId: '11111111-1111-4111-8111-111111111111',
        events: [],
    })

    it('geçerli imzayı kabul eder', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const res = verifyOgziePush(rawBody, ts, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(true)
    })

    it('public JWK string olarak verildiğinde de doğrular', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const res = verifyOgziePush(rawBody, ts, sig, { aud: AUD, publicJwk: JSON.stringify(publicJwk) })
        expect(res.ok).toBe(true)
    })

    it('en fazla iki public JWK içinden imzayı doğrulayan anahtarı kabul eder', () => {
        const ts = nowTs()
        const sig = signWith(rawBody, ts, secondaryPrivateKey)
        const res = verifyOgziePush(rawBody, ts, sig, {
            aud: AUD,
            publicJwks: [publicJwk, secondaryPublicJwk],
        })
        expect(res.ok).toBe(true)
    })

    it('bozuk bir anahtar diğer anahtarın geçerli imzasını engellemez', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const res = verifyOgziePush(rawBody, ts, sig, {
            aud: AUD,
            publicJwks: ['{malformed', publicJwk],
        })
        expect(res.ok).toBe(true)
    })

    it('ikiden fazla doğrulama anahtarını reddeder', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const res = verifyOgziePush(rawBody, ts, sig, {
            aud: AUD,
            publicJwks: [publicJwk, secondaryPublicJwk, publicJwk],
        })
        expect(res).toEqual({ ok: false, reason: 'too_many_public_keys' })
    })

    it('private alan içeren Ed25519 JWK kabul etmez', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const res = verifyOgziePush(rawBody, ts, sig, { aud: AUD, publicJwk: privateJwk })
        expect(res).toEqual({ ok: false, reason: 'bad_public_key' })
    })

    it('gövde değiştirilirse reddeder (bodyHash uyuşmaz)', () => {
        const ts = nowTs()
        const sig = sign(rawBody, ts)
        const tampered = rawBody.replace('events":[]', 'events":[{"x":1}]')
        const res = verifyOgziePush(tampered, ts, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.reason).toBe('invalid_signature')
    })

    it('yanlış audience reddedilir (imza farklı aud için üretildi)', () => {
        const ts = nowTs()
        // İmza farklı bir aud için üretilirse doğrulayıcının AUD'si ile uyuşmaz.
        const sig = sign(rawBody, ts, 'https://evil.example')
        const res = verifyOgziePush(rawBody, ts, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.reason).toBe('invalid_signature')
    })

    it('bayat timestamp reddedilir (±300s dışı)', () => {
        const staleTs = String(Math.floor(Date.now() / 1000) - 1000)
        const sig = sign(rawBody, staleTs)
        const res = verifyOgziePush(rawBody, staleTs, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.reason).toBe('stale_timestamp')
    })

    it('gelecekteki timestamp da tolerans dışında reddedilir', () => {
        const futureTs = String(Math.floor(Date.now() / 1000) + 1000)
        const sig = sign(rawBody, futureTs)
        const res = verifyOgziePush(rawBody, futureTs, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.reason).toBe('stale_timestamp')
    })

    it('eksik/bozuk imza header reddedilir', () => {
        const ts = nowTs()
        expect(verifyOgziePush(rawBody, ts, null, { aud: AUD, publicJwk }).ok).toBe(false)
        expect(verifyOgziePush(rawBody, ts, '', { aud: AUD, publicJwk }).ok).toBe(false)
        expect(verifyOgziePush(rawBody, ts, 'v2=abc', { aud: AUD, publicJwk }).ok).toBe(false)
        expect(verifyOgziePush(rawBody, ts, 'garbage', { aud: AUD, publicJwk }).ok).toBe(false)
    })

    it('eksik/bozuk timestamp header reddedilir', () => {
        const sig = sign(rawBody, nowTs())
        expect(verifyOgziePush(rawBody, null, sig, { aud: AUD, publicJwk }).ok).toBe(false)
        expect(verifyOgziePush(rawBody, 'abc', sig, { aud: AUD, publicJwk }).ok).toBe(false)
        expect(verifyOgziePush(rawBody, '', sig, { aud: AUD, publicJwk }).ok).toBe(false)
    })

    it('başka anahtarla üretilen imza reddedilir', () => {
        const ts = nowTs()
        const other = generateKeyPairSync('ed25519').privateKey
        const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex')
        const input = Buffer.from(signingInput(AUD, ts, bodyHash), 'utf8')
        const sig = `v1=${edSign(null, input, other).toString('base64url')}`
        const res = verifyOgziePush(rawBody, ts, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(false)
        if (!res.ok) expect(res.reason).toBe('invalid_signature')
    })

    it('signingInput sözleşmedeki bayt deseniyle birebir aynı', () => {
        const ts = '1700000000'
        const bodyHash = 'a'.repeat(64)
        expect(signingInput(AUD, ts, bodyHash)).toBe(
            `ogzie-finance-push:v1:${AUD}:${ts}.${bodyHash}`,
        )
    })

    it('imza string\'i sha256(rawBody) hex küçük harf kullanır (gönderici uyumu)', () => {
        // Gönderici createHash(...).digest("hex") küçük harf üretir; round-trip
        // burada test edilen sign() ile zaten aynı hash'i kullanır.
        const ts = nowTs()
        const body = '{"aud":"' + AUD + '","batchId":"x","events":[]}'
        const sig = sign(body, ts)
        const res = verifyOgziePush(body, ts, sig, { aud: AUD, publicJwk })
        expect(res.ok).toBe(true)
        // createPrivateKey JWK round-trip sanity (private JWK → KeyObject).
        const jwk = (privateKey.export({ format: 'jwk' }) as JsonWebKey)
        expect(createPrivateKey({ key: jwk, format: 'jwk' })).toBeDefined()
    })
})
