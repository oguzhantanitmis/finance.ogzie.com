import { describe, it, expect, vi } from 'vitest'
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }))
vi.mock('@/lib/ogzie-sso', () => ({ verifyAndConsumeOgzieTicket: vi.fn() }))
vi.mock('@/lib/ogzie-identity', () => ({ linkOgzieIdentity: vi.fn() }))
import { authOptions } from '@/lib/auth'
describe('credentials failure classification', () => {
 it('DB outage stays SERVICE_UNAVAILABLE; no raw exception or false bad password', async () => {
  findUnique.mockRejectedValueOnce(new Error('PRIVATE_DB_SENTINEL'))
  const provider = authOptions.providers[0] as unknown as { options: { authorize: (credentials: object, request: object) => Promise<unknown> } }
  await expect(provider.options.authorize({ email: 'fixture@example.invalid', password: 'fixture' }, { headers: {} })).rejects.toThrow(/^SERVICE_UNAVAILABLE$/)
 })
 it('unknown user is still an authentication rejection', async () => {
  findUnique.mockResolvedValueOnce(null)
  const provider = authOptions.providers[0] as unknown as { options: { authorize: (credentials: object, request: object) => Promise<unknown> } }
  await expect(provider.options.authorize({ email: 'fixture@example.invalid', password: 'fixture' }, { headers: {} })).resolves.toBeNull()
 })
})
