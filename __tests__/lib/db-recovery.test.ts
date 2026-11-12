import { describe, expect, it } from 'vitest'
import { isDbConnectionError, withDbRetry } from '@/lib/prisma'
import { sanitizeDbFailure } from '@/lib/db-timeouts'

describe('redacted database outages', () => {
    it.each(['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT'])(
        'recognizes %s after diagnostics are removed', (code) => {
            expect(isDbConnectionError(sanitizeDbFailure(Object.assign(new Error('PRIVATE_DB_SENTINEL'), { code })))).toBe(true)
        },
    )
    it('retries a safe read after a redacted connection failure', async () => {
        let attempts = 0
        const result = await withDbRetry(async () => {
            if (++attempts === 1) throw sanitizeDbFailure(Object.assign(new Error(), { code: 'P1001' }))
            return 'ready'
        }, { delayMs: 0 })
        expect(result).toBe('ready')
        expect(attempts).toBe(2)
    })
    it('does not retry a constraint failure', async () => {
        let attempts = 0
        await expect(withDbRetry(async () => {
            attempts++
            throw sanitizeDbFailure(Object.assign(new Error(), { code: 'P2002' }))
        }, { delayMs: 0 })).rejects.toMatchObject({ code: 'P2002' })
        expect(attempts).toBe(1)
    })
})
