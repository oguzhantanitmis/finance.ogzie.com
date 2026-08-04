import { beforeEach, describe, expect, it, vi } from 'vitest'

const subscription = vi.hoisted(() => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: { subscription } }))

import { syncOgzieDomainSubscriptions } from '@/lib/ogzie-subscription-sync'

const forecast = {
    externalId: 'domain:asset-1:forecast:2026-10-01',
    assetType: 'domain' as const,
    assetId: 'asset-1',
    assetName: 'Example.COM',
    providerDomain: 'Example.COM',
    mode: 'forecast' as const,
    direction: 'out' as const,
    amountCents: 12000,
    currency: 'usd',
    occurredOn: '2026-10-01',
    billingCycle: 'yearly' as const,
    description: 'Domain: example.com',
}

beforeEach(() => {
    vi.clearAllMocks()
    subscription.findUnique.mockResolvedValue(null)
    subscription.findFirst.mockResolvedValue(null)
    subscription.update.mockResolvedValue({})
    subscription.create.mockResolvedValue({})
})

describe('ogzie domain → abonelik senkronu', () => {
    it('yeni domaini kaynak kimliğiyle yıllık abonelik olarak oluşturur', async () => {
        await expect(syncOgzieDomainSubscriptions('user-1', [forecast])).resolves.toBe(1)
        expect(subscription.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user-1',
                source: 'ogzie',
                externalId: 'domain:asset-1',
                providerDomain: 'example.com',
                amount: 120,
                currency: 'USD',
                monthlyNormalizedAmount: 10,
            }),
        })
    })

    it('aynı providerDomain manuel kaydını sahiplenir, ikinci kayıt açmaz', async () => {
        subscription.findFirst.mockResolvedValue({ id: 'manual-1' })
        await syncOgzieDomainSubscriptions('user-1', [forecast])
        expect(subscription.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'manual-1' } }))
        expect(subscription.create).not.toHaveBeenCalled()
    })

    it('actual olayını abonelik tarihine uygulamaz', async () => {
        const count = await syncOgzieDomainSubscriptions('user-1', [{ ...forecast, mode: 'actual' }])
        expect(count).toBe(0)
        expect(subscription.create).not.toHaveBeenCalled()
        expect(subscription.update).not.toHaveBeenCalled()
    })
})
