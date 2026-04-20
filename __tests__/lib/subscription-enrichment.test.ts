import { describe, expect, it } from 'vitest'

import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

describe('enrichSubscriptionName', () => {
    it('known brand names are canonicalized', () => {
        const result = enrichSubscriptionName('chatgpt')

        expect(result.brandKey).toBe('chatgpt')
        expect(result.displayName).toBe('ChatGPT')
        expect(result.shouldCanonicalizeName).toBe(true)
        expect(result.matchType).toBe('exact')
    })

    it('typo-tolerant input still resolves to canonical brand name', () => {
        const result = enrichSubscriptionName('chatpgt')

        expect(result.brandKey).toBe('chatgpt')
        expect(result.displayName).toBe('ChatGPT')
        expect(result.shouldCanonicalizeName).toBe(true)
        expect(result.matchType).toBe('fuzzy')
    })

    it('brand phrases with extra context keep their custom name', () => {
        const result = enrichSubscriptionName('openai chatgpt team plan')

        expect(result.brandKey).toBe('chatgpt')
        expect(result.displayName).toBe('ChatGPT')
        expect(result.shouldCanonicalizeName).toBe(false)
        expect(result.matchType).toBe('contains')
    })

    it('unknown names stay unchanged', () => {
        const result = enrichSubscriptionName('Benim Özel Servisim')

        expect(result.displayName).toBe('Benim Özel Servisim')
        expect(result.shouldCanonicalizeName).toBe(false)
        expect(result.matchType).toBe('generic')
    })
})
