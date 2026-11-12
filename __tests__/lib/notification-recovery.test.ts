import { describe, expect, it, vi } from 'vitest'
import { loadNotificationAlerts } from '@/lib/notification-recovery'

describe('notification loading recovery', () => {
    it('returns alerts only after both actions succeed', async () => {
        const alerts = [{ id: 'alert-1' }]
        await expect(loadNotificationAlerts(
            async () => ({ success: true }),
            async () => ({ success: true, alerts }),
        )).resolves.toEqual(alerts)
    })

    it.each(['generation', 'read'] as const)('rejects %s success:false instead of showing empty state', async step => {
        await expect(loadNotificationAlerts(
            async () => ({ success: step !== 'generation' }),
            async () => ({ success: step !== 'read', alerts: [] }),
        )).rejects.toThrow()
    })

    it('rejects a failed action and a hung action within a finite time', async () => {
        await expect(loadNotificationAlerts(
            async () => { throw new Error('network down') },
            async () => ({ success: true, alerts: [] }),
        )).rejects.toThrow('network down')

        vi.useFakeTimers()
        try {
            const pending = loadNotificationAlerts(
                () => new Promise(() => {}),
                async () => ({ success: true, alerts: [] }),
                100,
            )
            const assertion = expect(pending).rejects.toThrow('timed out')
            await vi.advanceTimersByTimeAsync(100)
            await assertion
        } finally {
            vi.useRealTimers()
        }
    })
})
