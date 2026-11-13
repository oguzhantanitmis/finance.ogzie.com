import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { findUnique, updateMany } = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
    prisma: { user: { findUnique, updateMany } },
    isDbConnectionError: (error: unknown) => error instanceof Error && 'code' in error && error.code === 'P1001',
}))
vi.mock('@/lib/rate-limit', () => ({ clientIp: () => 'fixture', rateLimit: () => true }))
import { POST } from '@/app/api/auth/reset-password/route'

const request = () => new NextRequest('https://fixture.invalid/api/auth/reset-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'fixture-token', newPassword: 'new-password-123' }),
})
const user = { id: 'fixture', passwordResetExpiry: new Date(Date.now() + 60_000) }
const dbFailure = () => Object.assign(new Error('PRIVATE_DB_SENTINEL'), { code: 'P1001' })

describe('reset password outage and uncertain write', () => {
    beforeEach(() => { findUnique.mockReset(); updateMany.mockReset() })

    it('reports read outage as 503 before any write', async () => {
        findUnique.mockRejectedValueOnce(dbFailure())
        const response = await POST(request())
        expect(response.status).toBe(503)
        expect(await response.json()).toMatchObject({ outcome: 'not_started' })
        expect(updateMany).not.toHaveBeenCalled()
    })

    it('reports unknown outcome after the atomic write starts without retrying', async () => {
        findUnique.mockResolvedValueOnce(user)
        updateMany.mockRejectedValueOnce(dbFailure())
        const response = await POST(request())
        expect(response.status).toBe(503)
        const body = await response.json()
        expect(body.outcome).toBe('unknown')
        expect(JSON.stringify(body)).not.toContain('PRIVATE_DB_SENTINEL')
        expect(updateMany).toHaveBeenCalledTimes(1)
    })

    it('keeps successful one-time reset behavior', async () => {
        findUnique.mockResolvedValueOnce(user)
        updateMany.mockResolvedValueOnce({ count: 1 })
        const response = await POST(request())
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ ok: true })
    })
})
