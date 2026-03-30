import { describe, it, expect } from 'vitest'
import { getLimitWarningLevel, getLimitWarningColor } from '@/lib/card-engine/types'

describe('getLimitWarningLevel', () => {
    it('0% → SAFE', () => {
        expect(getLimitWarningLevel(0)).toBe('SAFE')
    })

    it('50% → SAFE', () => {
        expect(getLimitWarningLevel(50)).toBe('SAFE')
    })

    it('69% → SAFE', () => {
        expect(getLimitWarningLevel(69)).toBe('SAFE')
    })

    it('70% → WARNING', () => {
        expect(getLimitWarningLevel(70)).toBe('WARNING')
    })

    it('85% → WARNING', () => {
        expect(getLimitWarningLevel(85)).toBe('WARNING')
    })

    it('90% → DANGER', () => {
        expect(getLimitWarningLevel(90)).toBe('DANGER')
    })

    it('99% → DANGER', () => {
        expect(getLimitWarningLevel(99)).toBe('DANGER')
    })

    it('100% → CRITICAL', () => {
        expect(getLimitWarningLevel(100)).toBe('CRITICAL')
    })

    it('120% (aşım) → CRITICAL', () => {
        expect(getLimitWarningLevel(120)).toBe('CRITICAL')
    })
})

describe('getLimitWarningColor', () => {
    it('SAFE → yeşil', () => {
        expect(getLimitWarningColor('SAFE')).toBe('#22C55E')
    })

    it('WARNING → sarı', () => {
        expect(getLimitWarningColor('WARNING')).toBe('#EAB308')
    })

    it('DANGER → turuncu', () => {
        expect(getLimitWarningColor('DANGER')).toBe('#F97316')
    })

    it('CRITICAL → kırmızı', () => {
        expect(getLimitWarningColor('CRITICAL')).toBe('#EF4444')
    })
})
