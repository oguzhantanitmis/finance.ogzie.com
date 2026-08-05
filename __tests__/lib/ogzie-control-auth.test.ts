import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createHash, generateKeyPairSync, sign as edSign, type JsonWebKey, type KeyObject } from 'node:crypto'
import { authenticateOgzieControlRequest } from '@/lib/ogzie-control-auth'
import { signingInput } from '@/lib/ogzie-ingest-verify'

const AUD = 'https://finance.ogzie.com'
let privateKey: KeyObject
let publicJwk: JsonWebKey
const previousEnv = { ...process.env }

beforeAll(() => {
    const pair = generateKeyPairSync('ed25519')
    privateKey = pair.privateKey
    publicJwk = pair.publicKey.export({ format: 'jwk' })
})

afterEach(() => {
    process.env = { ...previousEnv }
})

function configure() {
    process.env.OGZIE_FINANCE_PUSH_AUDIENCE = AUD
    process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK = JSON.stringify(publicJwk)
    process.env.OGZIE_APP_ISSUER = 'https://app.ogzie.com'
    process.env.OGZIE_APP_SUBJECT = 'owner'
}

function signedRequest(body: object): Request {
    const raw = JSON.stringify(body)
    const timestamp = String(Math.floor(Date.now() / 1000))
    const bodyHash = createHash('sha256').update(raw, 'utf8').digest('hex')
    const signature = edSign(null, Buffer.from(signingInput(AUD, timestamp, bodyHash)), privateKey)
    return new Request('https://finance.ogzie.com/api/ogzie-sync/snapshot', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-ogzie-timestamp': timestamp,
            'x-ogzie-signature': `v1=${signature.toString('base64url')}`,
        },
        body: raw,
    })
}

describe('authenticateOgzieControlRequest', () => {
    it('geçerli imza ve sabit kimliği kabul eder', async () => {
        configure()
        const result = await authenticateOgzieControlRequest(signedRequest({
            version: 2,
            aud: AUD,
            requestId: '11111111-1111-4111-8111-111111111111',
            identity: { issuer: 'https://app.ogzie.com', subject: 'owner' },
        }))
        expect(result.ok).toBe(true)
    })

    it('imza geçerli olsa bile farklı kimliği reddeder', async () => {
        configure()
        const result = await authenticateOgzieControlRequest(signedRequest({
            version: 2,
            aud: AUD,
            identity: { issuer: 'https://evil.example', subject: 'owner' },
        }))
        expect(result).toMatchObject({ ok: false, status: 403, reason: 'identity_mismatch' })
    })

    it('eksik yapılandırmada fail-closed davranır', async () => {
        delete process.env.OGZIE_FINANCE_PUSH_PUBLIC_JWK
        delete process.env.OGZIE_APP_ISSUER
        const result = await authenticateOgzieControlRequest(new Request('https://finance.ogzie.com'))
        expect(result).toMatchObject({ ok: false, status: 503, reason: 'control_not_configured' })
    })
})
