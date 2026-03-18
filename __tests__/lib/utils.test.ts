import { describe, it, expect } from 'vitest'
import { formatCurrency, cn } from '@/lib/utils'

describe('formatCurrency', () => {
    it('TRY formatlar', () => {
        const result = formatCurrency(1500.5, 'TRY')
        expect(result).toContain('1')
        expect(result).toContain('500')
    })

    it('0 TL', () => {
        const result = formatCurrency(0, 'TRY')
        expect(result).toBeDefined()
    })

    it('negatif tutar', () => {
        const result = formatCurrency(-500, 'TRY')
        expect(result).toContain('500')
    })

    it('büyük tutar (1M)', () => {
        const result = formatCurrency(1000000, 'TRY')
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
    })

    it('küçük tutar (0.01)', () => {
        const result = formatCurrency(0.01, 'TRY')
        expect(result).toBeDefined()
    })
})

describe('cn (classname merger)', () => {
    it('birden fazla sınıf birleştirir', () => {
        const result = cn('text-white', 'font-bold')
        expect(result).toContain('text-white')
        expect(result).toContain('font-bold')
    })

    it('conditional sınıflar', () => {
        const result = cn('base', true && 'active', false && 'hidden')
        expect(result).toContain('base')
        expect(result).toContain('active')
        expect(result).not.toContain('hidden')
    })

    it('undefined değerler', () => {
        const result = cn('base', undefined, null)
        expect(result).toContain('base')
    })
})
