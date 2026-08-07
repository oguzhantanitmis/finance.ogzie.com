import {
    createHash,
    generateKeyPairSync,
    sign as edSign,
    type JsonWebKey,
    type KeyObject,
} from 'node:crypto'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/ogzie-sync/commands/route'
import { signingInput } from '@/lib/ogzie-ingest-verify'

const AUD = 'https://finance.ogzie.com'
const RAW_BODY = '{not-json'

type SigningKey = {
    privateKey: KeyObject
    publicJwk: JsonWebKey
    privateJwk: JsonWebKey
}

let primary: SigningKey
let hermes: SigningKey
let unrelated: SigningKey

function signingKey(): SigningKey {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    return {
        privateKey,
        publicJwk: publicKey.export({ format: 'jwk' }),
        privateJwk: privateKey.export({ format: 'jwk' }),
    }
}

beforeAll(() => {
    primary = signingKey()
    hermes = signingKey()
    unrelated = signingKey()
})

afterEach(() => {
    vi.unstubAllEnvs()
})

function signature(privateKey: KeyObject, timestamp: string): string {
    const bodyHash = createHash('sha256').update(RAW_BODY, 'utf8').digest('hex')
    const input = Buffer.from(signingInput(AUD, timestamp, bodyHash), 'utf8')
    return `v1=${edSign(null, input, privateKey).toString('base64url')}`
}

function request(privateKey: KeyObject): Request {
    const timestamp = String(Math.floor(Date.now() / 1000))
    return new Request('https://finance.ogzie.com/api/ogzie-sync/commands', {
        method: 'POST',
        headers: {
            'x-ogzie-timestamp': timestamp,
            'x-ogzie-signature': signature(privateKey, timestamp),
        },
        body: RAW_BODY,
    })
}

function configure(primaryJwk?: string, hermesJwk?: string) {
    vi.stubEnv('OGZIE_FINANCE_PUSH_AUDIENCE', AUD)
    vi.stubEnv('OGZIE_FINANCE_PUSH_PUBLIC_JWK', primaryJwk ?? '')
    vi.stubEnv('OGZIE_FINANCE_HERMES_PUBLIC_JWK', hermesJwk ?? '')
}

describe('POST /api/ogzie-sync/commands signer authentication', () => {
    it('accepts a request signed by the primary App key', async () => {
        configure(JSON.stringify(primary.publicJwk))

        const response = await POST(request(primary.privateKey))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_json' })
    })

    it('accepts a request signed by the optional Hermes key', async () => {
        configure(undefined, JSON.stringify(hermes.publicJwk))

        const response = await POST(request(hermes.privateKey))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_json' })
    })

    it('keeps accepting a valid primary signature when the secondary key is malformed', async () => {
        configure(JSON.stringify(primary.publicJwk), '{malformed')

        const response = await POST(request(primary.privateKey))

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_json' })
    })

    it('fails closed when neither configured key verifies the signature', async () => {
        configure(JSON.stringify(primary.publicJwk), JSON.stringify(hermes.publicJwk))

        const response = await POST(request(unrelated.privateKey))

        expect(response.status).toBe(401)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'unauthorized' })
    })

    it('returns not_configured when both public keys are absent', async () => {
        configure()

        const response = await POST(request(primary.privateKey))

        expect(response.status).toBe(500)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'not_configured' })
    })

    it('rejects an Ed25519 JWK containing private key material', async () => {
        configure(JSON.stringify(primary.privateJwk))

        const response = await POST(request(primary.privateKey))

        expect(response.status).toBe(401)
        await expect(response.json()).resolves.toEqual({ ok: false, error: 'unauthorized' })
    })
})
