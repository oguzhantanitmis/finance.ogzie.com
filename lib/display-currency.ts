/**
 * Görüntüleme para birimi — tüm tutarlar DB'de TRY saklanır,
 * gösterim katmanı kullanıcının ana para birimine çevirir.
 *
 * `rate` = 1 birim hedef para biriminin TRY karşılığı (CollectAPI satış kuru).
 * Modül singleton'ı CurrencyProvider tarafından render gövdesinde set edilir;
 * böylece tüm istemci bileşenleri (SSR dahil) doğru birimle biçimlendirir.
 * Server component'ler `getUserDisplayCurrency()` ile açıkça alır.
 */

export type DisplayCurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP' | 'XAU'

export interface DisplayCurrency {
    code: DisplayCurrencyCode
    /** 1 birim hedefin TRY karşılığı; TRY için 1 */
    rate: number
}

export const TRY_DISPLAY: DisplayCurrency = { code: 'TRY', rate: 1 }

export const DISPLAY_CURRENCY_CODES: DisplayCurrencyCode[] = ['TRY', 'USD', 'EUR', 'GBP', 'XAU']

// Modül singleton — istemcide sekme başına tek kullanıcı olduğu için güvenli.
// (SSR'da eşzamanlı farklı kullanıcı istekleri teoride yarışabilir; tek
// haneli kullanıcılı bu uygulama için kabul edilmiş bir sınırlamadır.)
let active: DisplayCurrency = TRY_DISPLAY

export function setActiveDisplayCurrency(display: DisplayCurrency) {
    active = display.rate > 0 ? display : TRY_DISPLAY
}

export function getActiveDisplayCurrency(): DisplayCurrency {
    return active
}

/** TRY tutarını hedef birime çevirir (rate yoksa TRY kalır) */
export function convertFromTry(amountTry: number, display: DisplayCurrency = active): number {
    if (display.code === 'TRY' || display.rate <= 0) return amountTry
    return amountTry / display.rate
}

const FIAT_FORMATTERS: Partial<Record<DisplayCurrencyCode, Intl.NumberFormat>> = {}

function fiatFormatter(code: 'TRY' | 'USD' | 'EUR' | 'GBP') {
    return (FIAT_FORMATTERS[code] ??= new Intl.NumberFormat('tr-TR', { style: 'currency', currency: code }))
}

const GRAM_FORMATTER = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** TRY tutarını aktif (veya verilen) birime çevirip biçimlendirir */
export function formatTryAmount(amountTry: number, display: DisplayCurrency = active): string {
    const value = convertFromTry(amountTry, display)
    if (display.code === 'XAU' && display.rate > 0) {
        return `${GRAM_FORMATTER.format(value)} gr`
    }
    if (display.code === 'XAU') {
        return fiatFormatter('TRY').format(amountTry)
    }
    return fiatFormatter(display.code).format(value)
}

/** Kompakt (kuruşsuz) biçim — mobil ekran kartları için */
const COMPACT_FORMATTERS: Partial<Record<string, Intl.NumberFormat>> = {}

const COMPACT_SYMBOL: Record<DisplayCurrencyCode, string> = {
    TRY: '₺', USD: '$', EUR: '€', GBP: '£', XAU: '',
}

export function formatTryAmountCompact(amountTry: number, display: DisplayCurrency = active): string {
    const code = display.rate > 0 ? display.code : 'TRY'
    const value = convertFromTry(amountTry, display)
    if (code === 'XAU') {
        return `${GRAM_FORMATTER.format(value)} gr`
    }
    const fmt = (COMPACT_FORMATTERS[code] ??= new Intl.NumberFormat('tr-TR', {
        maximumFractionDigits: code === 'TRY' ? 0 : 2,
    }))
    return COMPACT_SYMBOL[code] + fmt.format(code === 'TRY' ? Math.round(value) : value)
}
