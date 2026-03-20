import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildChatPrompt } from '@/lib/ai/prompt-builder'

describe('buildSystemPrompt', () => {
    it('Türkçe finans koçu prompt döndürür', () => {
        const prompt = buildSystemPrompt()
        expect(prompt).toContain('finans koçu')
        expect(prompt).toContain('TL')
    })

    it('hallüsinasyon yasağı içerir', () => {
        const prompt = buildSystemPrompt()
        expect(prompt.toLowerCase()).toContain('uydurmak')
        expect(prompt.toLowerCase()).toContain('yasak')
    })

    it('borç kapatma hedefini vurgular', () => {
        const prompt = buildSystemPrompt()
        expect(prompt.toLowerCase()).toContain('borç')
    })

    it('öneri formatını tanımlar', () => {
        const prompt = buildSystemPrompt()
        expect(prompt).toContain('Öneri')
        expect(prompt).toContain('Risk')
        expect(prompt).toContain('Aksiyon')
    })

    it('uzmanlık alanlarını listeler', () => {
        const prompt = buildSystemPrompt()
        expect(prompt).toContain('Kredi kartı')
        expect(prompt.toLowerCase()).toContain('bütçe')
    })
})

describe('buildChatPrompt', () => {
    it('context ve kullanıcı mesajını birleştirir', () => {
        const result = buildChatPrompt('test context', 'test mesaj')
        expect(result).toContain('test context')
        expect(result).toContain('test mesaj')
    })

    it('boş context ile çalışır', () => {
        const result = buildChatPrompt('', 'soru')
        expect(result).toContain('soru')
    })
})
