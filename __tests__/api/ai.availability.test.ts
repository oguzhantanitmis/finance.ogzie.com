import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireSuperuser } = vi.hoisted(() => ({ requireSuperuser: vi.fn() }))
vi.mock('@/lib/server-auth', () => ({ requireSuperuser }))
vi.mock('@/lib/prisma', () => ({ prisma: {}, isDbConnectionError: (error: unknown) => error instanceof Error && 'code' in error && error.code === 'P1001' }))
vi.mock('@/lib/ai/context-composer', () => ({ composeFinancialContext: vi.fn() }))
vi.mock('@/lib/ai/prompt-builder', () => ({ buildSystemPrompt: vi.fn(), buildChatPrompt: vi.fn() }))
vi.mock('@/lib/ai-usage', () => ({ isOverQuota: vi.fn(), recordUsage: vi.fn() }))
vi.mock('@/lib/finance-assistant', () => ({ answerFinanceAssistant: vi.fn() }))
import { POST } from '@/app/api/ai/route'

const request = () => new Request('https://fixture.invalid/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'merhaba' }),
})

describe('AI authorization failure classification', () => {
    beforeEach(() => requireSuperuser.mockReset())

    it.each([['Unauthorized', 401], ['Forbidden', 403]])('%s stays %i', async (message, status) => {
        requireSuperuser.mockRejectedValueOnce(new Error(message))
        expect((await POST(request())).status).toBe(status)
    })

    it('DB outage is 503 without raw diagnostics or session clearing', async () => {
        requireSuperuser.mockRejectedValueOnce(Object.assign(new Error('PRIVATE_DB_SENTINEL'), { code: 'P1001' }))
        const response = await POST(request())
        expect(response.status).toBe(503)
        expect(response.headers.get('set-cookie')).toBeNull()
        expect(await response.text()).not.toContain('PRIVATE_DB_SENTINEL')
    })
})
