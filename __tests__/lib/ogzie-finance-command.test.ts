import { describe, expect, it } from 'vitest'

import { financeDescription, validFinancePayload } from '@/lib/ogzie-finance-command'

const payload = {
    draftId: 'mail-suggestion-123',
    name: 'Hepsiburada',
    amountCents: 111720,
    currency: 'TRY',
    billingCycle: 'monthly' as const,
    nextPayment: '2026-08-05',
}

describe('ogzie finance command description', () => {
    it('kullanıcının yazdığı açıklamayı kabul eder ve temizler', () => {
        expect(validFinancePayload({
            ...payload,
            description: '  Dardanel siparişi e-arşiv faturası  ',
        })).toBe(true)
        expect(financeDescription({
            name: payload.name,
            description: '  Dardanel siparişi e-arşiv faturası  ',
        })).toBe('Dardanel siparişi e-arşiv faturası')
    })

    it('eski istemcide sağlayıcı adını açıklama olarak korur', () => {
        expect(validFinancePayload(payload)).toBe(true)
        expect(financeDescription(payload)).toBe('Hepsiburada')
    })

    it('boş veya aşırı uzun açıklamayı reddeder', () => {
        expect(validFinancePayload({ ...payload, description: '  ' })).toBe(false)
        expect(validFinancePayload({ ...payload, description: 'x'.repeat(301) })).toBe(false)
    })
})
