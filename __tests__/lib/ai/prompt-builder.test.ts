import { describe, it, expect } from 'vitest'
import {
    buildSystemPrompt,
    buildChatPrompt,
    buildDebtAnalysisPrompt,
    buildInvestmentPrompt,
    buildSpendingAnalysisPrompt,
    buildEmergencyAssessmentPrompt,
} from '@/lib/ai/prompt-builder'

describe('buildSystemPrompt', () => {
    const prompt = buildSystemPrompt()

    it('Türkçe finans koçu rolü', () => {
        expect(prompt).toContain('finans koçu')
    })

    it('TL para birimi tanımlı', () => {
        expect(prompt).toContain('TL')
    })

    it('KKDF ve BSMV vergi oranları', () => {
        expect(prompt).toContain('KKDF')
        expect(prompt).toContain('BSMV')
        expect(prompt).toContain('%15')
    })

    it('hallüsinasyon yasağı', () => {
        expect(prompt.toLowerCase()).toContain('uydurmak')
        expect(prompt.toLowerCase()).toContain('yasak')
    })

    it('6 öneri tipi tanımlı', () => {
        expect(prompt).toContain('STRATEGY')
        expect(prompt).toContain('SAVING')
        expect(prompt).toContain('WARNING')
        expect(prompt).toContain('OPPORTUNITY')
        expect(prompt).toContain('MILESTONE')
        expect(prompt).toContain('ALERT')
    })

    it('cevap formatı açıklanmış', () => {
        expect(prompt).toContain('Öneri')
        expect(prompt).toContain('Risk')
        expect(prompt).toContain('Aksiyon')
    })

    it('Türkiye bağlamı kart faizleri', () => {
        expect(prompt).toContain('Kredi kartı')
    })
})

describe('buildChatPrompt', () => {
    it('context ve kullanıcı mesajını birleştirir', () => {
        const result = buildChatPrompt('Nakit: 10000 TL', 'Birikimimi nasıl değerlendirmeliyim?')
        expect(result).toContain('Nakit: 10000 TL')
        expect(result).toContain('Birikimimi nasıl değerlendirmeliyim?')
    })

    it('boş context', () => {
        const result = buildChatPrompt('', 'Sorum var')
        expect(result).toContain('Sorum var')
    })

    it('tarihsel trend notunu içerir', () => {
        const result = buildChatPrompt('data', 'soru')
        expect(result.toLowerCase()).toContain('trend')
    })
})

describe('buildDebtAnalysisPrompt', () => {
    it('borç analiz görevlerini listeler', () => {
        const result = buildDebtAnalysisPrompt('Toplam borç: 50000 TL')
        expect(result).toContain('Toplam borç: 50000 TL')
        expect(result).toContain('Avalanche')
        expect(result).toContain('Snowball')
    })

    it('borçsuz kalma süresi tahmini ister', () => {
        const result = buildDebtAnalysisPrompt('data')
        expect(result).toContain('borçsuz')
    })
})

describe('buildInvestmentPrompt', () => {
    it('acil durum fonu kontrolü', () => {
        const result = buildInvestmentPrompt('data')
        expect(result).toContain('Acil durum')
    })

    it('borç önceliği prensibi', () => {
        const result = buildInvestmentPrompt('data')
        expect(result).toContain('borç')
        expect(result).toContain('yatırım')
    })

    it('enflasyon dikkate alınır', () => {
        const result = buildInvestmentPrompt('data')
        expect(result).toContain('enflasyon')
    })
})

describe('buildSpendingAnalysisPrompt', () => {
    it('anormal artışlar tespit görevi', () => {
        const result = buildSpendingAnalysisPrompt('data')
        expect(result).toContain('Anormal')
        expect(result).toContain('%20')
    })

    it('tasarruf fırsatları beklenir', () => {
        const result = buildSpendingAnalysisPrompt('data')
        expect(result).toContain('Tasarruf')
    })
})

describe('buildEmergencyAssessmentPrompt', () => {
    it('acil risk kontrol listesi', () => {
        const result = buildEmergencyAssessmentPrompt('data')
        expect(result).toContain('KRITIK')
        expect(result).toContain('YÜKSEK')
        expect(result).toContain('ORTA')
    })

    it('7 günlük yaklaşan vadeler', () => {
        const result = buildEmergencyAssessmentPrompt('data')
        expect(result).toContain('7 gün')
    })

    it('temerrüt tehlikesi kontrolü', () => {
        const result = buildEmergencyAssessmentPrompt('data')
        expect(result).toContain('Temerrüt')
    })
})
