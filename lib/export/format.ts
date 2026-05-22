// Export-specific formatting (privacy-blur YOK, dosyaya yazılır)

export function formatCurrencyForExport(amount: number, currency: string = 'TRY'): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency === 'TL' ? 'TRY' : currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function formatNumberForExport(value: number, decimals = 2): string {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)
}

export function formatPercentForExport(value: number): string {
    return `%${(value * 100).toFixed(2)}`
}

export function formatDateForExport(date: Date | string | null | undefined): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })
}

export function formatDateTimeForExport(date: Date | string | null | undefined): string {
    if (!date) return '-'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

/** Dosya adı için Türkçe karakterleri ASCII'ye, boşlukları tire'ye çevir */
export function safeFilename(input: string): string {
    return input
        .toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
        .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function buildFilename(slug: string, ext: 'csv' | 'pdf'): string {
    const today = new Date().toISOString().slice(0, 10)
    return `ogzie-${safeFilename(slug)}-${today}.${ext}`
}
