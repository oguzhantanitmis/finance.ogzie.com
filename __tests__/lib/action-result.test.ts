import { describe, it, expect } from 'vitest'
import {
    ActionError,
    EMPTY_ACTION_RESULT,
    createSuccessResult,
    createErrorResult,
    toOptionalString,
    toRequiredString,
    toOptionalNumber,
    toRequiredNumber,
    getActionErrorResult,
} from '@/lib/action-result'

describe('EMPTY_ACTION_RESULT', () => {
    it('success false ve boş message', () => {
        expect(EMPTY_ACTION_RESULT.success).toBe(false)
        expect(EMPTY_ACTION_RESULT.message).toBe('')
        expect(EMPTY_ACTION_RESULT.fieldErrors).toEqual({})
    })
})

describe('createSuccessResult', () => {
    it('başarılı sonuç döndürür', () => {
        const result = createSuccessResult('Başarılı')
        expect(result.success).toBe(true)
        expect(result.message).toBe('Başarılı')
        expect(result.fieldErrors).toEqual({})
    })

    it('entityId ile döndürür', () => {
        const result = createSuccessResult('OK', 'abc-123')
        expect(result.entityId).toBe('abc-123')
    })
})

describe('createErrorResult', () => {
    it('hata sonucu döndürür', () => {
        const result = createErrorResult('Hata oluştu')
        expect(result.success).toBe(false)
        expect(result.message).toBe('Hata oluştu')
    })

    it('field hataları ile döndürür', () => {
        const result = createErrorResult('Hata', { name: 'İsim zorunlu' })
        expect(result.fieldErrors.name).toBe('İsim zorunlu')
    })
})

describe('ActionError', () => {
    it('Error extend eder', () => {
        const err = new ActionError('Test')
        expect(err).toBeInstanceOf(Error)
        expect(err.name).toBe('ActionError')
        expect(err.message).toBe('Test')
    })

    it('field hataları taşır', () => {
        const err = new ActionError('Hata', { email: 'Geçersiz' })
        expect(err.fieldErrors.email).toBe('Geçersiz')
    })
})

describe('getActionErrorResult', () => {
    it('ActionError → field hatalarını korur', () => {
        const err = new ActionError('Zorunlu alan', { name: 'Zorunlu' })
        const result = getActionErrorResult(err, 'Fallback')
        expect(result.success).toBe(false)
        expect(result.message).toBe('Zorunlu alan')
        expect(result.fieldErrors.name).toBe('Zorunlu')
    })

    it('normal Error → message kullanır', () => {
        const result = getActionErrorResult(new Error('DB hatası'), 'Fallback')
        expect(result.message).toBe('DB hatası')
    })

    it('bilinmeyen hata → fallback mesaj', () => {
        const result = getActionErrorResult('string error', 'Fallback')
        expect(result.message).toBe('Fallback')
    })
})

describe('toOptionalString', () => {
    it('boş string → undefined', () => {
        expect(toOptionalString('')).toBeUndefined()
    })

    it('whitespace → undefined', () => {
        expect(toOptionalString('   ')).toBeUndefined()
    })

    it('null → undefined', () => {
        expect(toOptionalString(null)).toBeUndefined()
    })

    it('geçerli değer → trimlenmiş string', () => {
        expect(toOptionalString('  test  ')).toBe('test')
    })
})

describe('toRequiredString', () => {
    it('boş string → ActionError fırlatır', () => {
        expect(() => toRequiredString('', 'name', 'İsim')).toThrow(ActionError)
    })

    it('geçerli değer → trimlenmiş string', () => {
        expect(toRequiredString(' Oğuzhan ', 'name', 'İsim')).toBe('Oğuzhan')
    })
})

describe('toOptionalNumber', () => {
    it('boş string → undefined', () => {
        expect(toOptionalNumber('')).toBeUndefined()
    })

    it('null → undefined', () => {
        expect(toOptionalNumber(null)).toBeUndefined()
    })

    it('geçerli sayı → number', () => {
        expect(toOptionalNumber('42.5')).toBe(42.5)
    })

    it('NaN string → undefined', () => {
        expect(toOptionalNumber('abc')).toBeUndefined()
    })
})

describe('toRequiredNumber', () => {
    it('NaN → ActionError', () => {
        expect(() => toRequiredNumber('abc', 'amount', 'Tutar')).toThrow(ActionError)
    })

    it('min altında → ActionError', () => {
        expect(() => toRequiredNumber('0', 'amount', 'Tutar', { min: 1 })).toThrow(ActionError)
    })

    it('geçerli değer → number', () => {
        expect(toRequiredNumber('100', 'amount', 'Tutar', { min: 0 })).toBe(100)
    })
})
