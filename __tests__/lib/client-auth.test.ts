import { afterEach, describe, expect, it, vi } from 'vitest'
import { safeCallbackPath, submitCredentials } from '@/lib/client-auth'

const origin = 'https://finance.ogzie.com'
afterEach(() => vi.unstubAllGlobals())

describe('credentials return path', () => {
    it('accepts only same-origin deep links', () => {
        expect(safeCallbackPath('/cards/42?tab=payments', origin)).toBe('/cards/42?tab=payments')
        for (const unsafe of ['https://evil.invalid/', '//evil.invalid/', '/\\evil.invalid', '/login', '/api/auth/callback/credentials']) {
            expect(safeCallbackPath(unsafe, origin)).toBe('/')
        }
    })

    it('passes the protected path to NextAuth and returns its verified destination', async () => {
        vi.stubGlobal('window', { location: { origin } })
        const fetch = vi.fn()
            .mockResolvedValueOnce(Response.json({ csrfToken: 'fixture' }))
            .mockResolvedValueOnce(Response.json({ url: `${origin}/cards/42?tab=payments&error=chart` }))
        vi.stubGlobal('fetch', fetch)
        const result = await submitCredentials('fixture@example.invalid', 'fixture', false, '/cards/42?tab=payments')
        const body = fetch.mock.calls[1][1].body as URLSearchParams
        expect(body.get('callbackUrl')).toBe(`${origin}/cards/42?tab=payments`)
        expect(result).toMatchObject({ error: null, callbackUrl: '/cards/42?tab=payments&error=chart' })
    })
})
