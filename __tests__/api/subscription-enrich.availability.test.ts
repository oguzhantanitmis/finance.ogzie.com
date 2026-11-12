import { describe, expect, it, vi } from 'vitest'
const { requireCurrentUser } = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({ requireCurrentUser }))
import { POST } from '@/app/api/subscription-enrich/route'

const request = () => new Request('https://fixture.invalid/api/subscription-enrich', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Netflix' }),
})
describe('subscription enrichment availability', () => {
    it('preserves 401 for a missing session', async () => {
        requireCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'))
        expect((await POST(request())).status).toBe(401)
    })
    it('reports a database outage as 503 without exposing diagnostics or clearing the session', async () => {
        requireCurrentUser.mockRejectedValueOnce(Object.assign(new Error('PRIVATE_DB_SENTINEL'), { code: 'P1001' }))
        const response = await POST(request())
        expect(response.status).toBe(503)
        expect(response.headers.get('set-cookie')).toBeNull()
        expect(await response.text()).not.toContain('PRIVATE_DB_SENTINEL')
    })
    it('preserves successful enrichment', async () => {
        requireCurrentUser.mockResolvedValueOnce({ id: 'fixture' })
        expect((await POST(request())).status).toBe(200)
    })
})
