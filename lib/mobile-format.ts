// Mobil ekran mapper'larının ortak format yardımcıları.
// Tümü saf fonksiyon — server component'lerde mapper içinde kullanılır,
// çıktıları serileştirilebilir düz değerlerdir.

const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const DAY_MS = 24 * 60 * 60 * 1000

function atMidnight(d: Date): number {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function daysUntil(date: Date | string | null | undefined): number | null {
    if (!date) return null
    const target = new Date(date)
    if (Number.isNaN(target.getTime())) return null
    return Math.round((atMidnight(target) - atMidnight(new Date())) / DAY_MS)
}

/**
 * "N gün" — DAİMA sayıyla başlar: DebtsMobile `parseInt(nextDue)` ile
 * sıralayıp "{nextDue} sonra" şeklinde render eder.
 */
export function daysUntilTr(date: Date | string | null | undefined): string {
    const days = daysUntil(date)
    if (days === null) {
        // Vade yoksa ay sonuna kalan gün pragmatik varsayılandır
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        return `${Math.max(0, Math.round((atMidnight(endOfMonth) - atMidnight(now)) / DAY_MS))} gün`
    }
    return `${Math.max(0, days)} gün`
}

export function relativeTr(date: Date | string): string {
    const days = daysUntil(date)
    if (days === null) return '—'
    const past = -days
    if (past <= 0) return 'bugün'
    if (past === 1) return 'dün'
    if (past < 30) return `${past} gün önce`
    return `${Math.floor(past / 30)} ay önce`
}

export function dateTr(date: Date | string): string {
    return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function monthYearTr(date: Date | string | null | undefined): string {
    if (!date) return '—'
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '—'
    return `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-01" → "Oca" */
export function monthKeyShortTr(key: string): string {
    const mm = Number(key.split('-')[1])
    return MONTHS_TR[mm - 1] ?? key
}

/** İki tarih arası tam ay farkı (a sonra, b önce), ≥ 0; geçersiz girişte 0. */
export function monthDiff(a: Date | string | null | undefined, b: Date | string | null | undefined): number {
    if (!a || !b) return 0
    const da = new Date(a)
    const db = new Date(b)
    if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0
    return Math.max(0, (da.getFullYear() - db.getFullYear()) * 12 + (da.getMonth() - db.getMonth()))
}

export function clampPct(n: number): number {
    if (!Number.isFinite(n)) return 0
    return Math.min(100, Math.max(0, Math.round(n)))
}

/** "#rrggbb" → HSL hue (0-360); parse edilemezse fallback. */
export function hexToHue(hex: string | null | undefined, fallback = 212): number {
    if (!hex) return fallback
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m) return fallback
    const num = parseInt(m[1], 16)
    const r = ((num >> 16) & 255) / 255
    const g = ((num >> 8) & 255) / 255
    const b = (num & 255) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max === min) return fallback // akromatik — hue tanımsız
    const d = max - min
    let h: number
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    return Math.round(((h * 60) + 360) % 360)
}

/** Deterministik hue: aynı seed her render'da aynı rengi verir. */
export function hashHue(seed: string): number {
    let acc = 0
    for (let i = 0; i < seed.length; i++) {
        acc = (acc * 31 + seed.charCodeAt(i)) % 360
    }
    return acc
}
