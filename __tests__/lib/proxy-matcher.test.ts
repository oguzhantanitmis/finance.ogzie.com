import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it } from 'vitest'

import { config } from '@/proxy'

function matches(pathname: string) {
    return unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `https://finance.ogzie.com${pathname}` })
}

describe('Finance proxy matcher', () => {
    it('lets signed Ogzie APIs reach their own Ed25519 authentication', () => {
        expect(matches('/api/ogzie-ingest')).toBe(false)
        expect(matches('/api/ogzie-sync/snapshot')).toBe(false)
        expect(matches('/api/ogzie-sync/commands')).toBe(false)
    })

    it('keeps normal Finance pages behind NextAuth', () => {
        expect(matches('/subscriptions')).toBe(true)
        expect(matches('/api/export/accounts')).toBe(true)
    })
})
