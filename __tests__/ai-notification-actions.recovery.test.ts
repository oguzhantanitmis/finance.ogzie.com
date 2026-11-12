import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getServerSession, getCurrentUser, requireSuperuser, runProactiveAiAnalysis, prisma } = vi.hoisted(() => ({
    getServerSession: vi.fn(),
    getCurrentUser: vi.fn(),
    requireSuperuser: vi.fn(),
    runProactiveAiAnalysis: vi.fn(),
    prisma: {
        aIInsight: { findFirst: vi.fn(), findMany: vi.fn() },
        budgetAlert: { findMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
        creditCard: { findMany: vi.fn() },
    },
}))
vi.mock('next-auth', () => ({ getServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/server-auth', () => ({ requireSuperuser, getCurrentUser }))
vi.mock('@/lib/authz', () => ({ isSuperuser: () => false }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/components/ai/InsightCard', () => ({ default: () => null }))
vi.mock('@/components/ai/AssistantMobile', () => ({ default: () => null }))
vi.mock('@/lib/prisma', () => ({ prisma }))
vi.mock('@/lib/ai/ai-analyst', () => ({ runProactiveAiAnalysis }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { triggerAiAnalysisAction, generateAvalancheInsights, getAlgorithmicInsights } from '@/app/actions/ai-actions'
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, generateSystemAlerts } from '@/app/actions/notification-actions'
import AIPage from '@/app/ai/page'

const privateFailure = new Error('PRIVATE_DB_SENTINEL email@example.invalid')

describe('AI and notification Server Actions redact failures', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
        getCurrentUser.mockResolvedValue({ id: 'user-1' })
    })

    it('does not render a failed generation as an empty insight list', async () => {
        prisma.aIInsight.findFirst.mockRejectedValueOnce(privateFailure)
        await expect(AIPage()).rejects.toThrow('AI insights unavailable')
        expect(prisma.aIInsight.findMany).not.toHaveBeenCalled()
    })

    it('does not render a failed insight read as an empty insight list', async () => {
        prisma.aIInsight.findFirst.mockResolvedValueOnce({ id: 'fresh' })
        prisma.aIInsight.findMany.mockRejectedValueOnce(privateFailure)
        await expect(AIPage()).rejects.toThrow('AI insights unavailable')
    })

    it('redacts AI generation and insight read failures', async () => {
        prisma.aIInsight.findFirst.mockRejectedValueOnce(privateFailure)
        prisma.aIInsight.findMany.mockRejectedValueOnce(privateFailure)
        const results = [await generateAvalancheInsights(), await getAlgorithmicInsights()]
        for (const result of results) {
            expect(result.success).toBe(false)
            expect(JSON.stringify(result)).not.toContain('PRIVATE_DB_SENTINEL')
            expect(JSON.stringify(result)).not.toContain('email@example.invalid')
        }
    })

    it('redacts analysis failures from the client result and server log', async () => {
        requireSuperuser.mockResolvedValueOnce({ id: 'user-1' })
        runProactiveAiAnalysis.mockRejectedValueOnce(privateFailure)
        const log = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const result = await triggerAiAnalysisAction()
            expect(result.success).toBe(false)
            expect(JSON.stringify(result)).not.toContain('PRIVATE_DB_SENTINEL')
            expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_DB_SENTINEL')
        } finally {
            log.mockRestore()
        }
    })

    it('redacts read, write, and generation failures without reporting success', async () => {
        prisma.budgetAlert.findMany.mockRejectedValueOnce(privateFailure)
        prisma.budgetAlert.updateMany.mockRejectedValueOnce(privateFailure).mockRejectedValueOnce(privateFailure)
        prisma.creditCard.findMany.mockRejectedValueOnce(privateFailure)
        const results = [
            await getUnreadNotifications(),
            await markNotificationAsRead('alert-1'),
            await markAllNotificationsAsRead(),
            await generateSystemAlerts(),
        ]
        for (const result of results) {
            expect(result.success).toBe(false)
            expect(JSON.stringify(result)).not.toContain('PRIVATE_DB_SENTINEL')
            expect(JSON.stringify(result)).not.toContain('email@example.invalid')
        }
    })
})
