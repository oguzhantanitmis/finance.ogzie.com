'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ExportButtonProps {
    /** /api/export/<module> — query'ye format eklenir */
    endpoint: string
    /** Sadece bir format desteklenir mi? Belirtilmezse her ikisi */
    formats?: ('csv' | 'pdf')[]
    /** Buton etiketi (default: "Dışa Aktar") */
    label?: string
    /** Ekstra query parametreleri (örn. { from: '2025-01-01' }) */
    params?: Record<string, string | undefined>
    /** Buton stilini overload et */
    className?: string
    /** İkon-only varyant (text-yok, sadece ikon) */
    iconOnly?: boolean
}

const FORMAT_META = {
    csv: { label: 'CSV (Excel)',    icon: FileSpreadsheet },
    pdf: { label: 'PDF',            icon: FileText },
} as const

export default function ExportButton({
    endpoint,
    formats = ['csv', 'pdf'],
    label = 'Dışa Aktar',
    params,
    className,
    iconOnly = false,
}: ExportButtonProps) {
    const [open, setOpen] = useState(false)
    const [loadingFmt, setLoadingFmt] = useState<'csv' | 'pdf' | null>(null)
    const ref = useRef<HTMLDivElement>(null)

    // Dış tıklama → kapat
    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    async function handleExport(format: 'csv' | 'pdf') {
        setOpen(false)
        setLoadingFmt(format)

        try {
            const qs = new URLSearchParams({ format })
            if (params) {
                for (const [k, v] of Object.entries(params)) {
                    if (v != null && v !== '') qs.append(k, v)
                }
            }

            const url = `${endpoint}?${qs.toString()}`
            const res = await fetch(url, { method: 'GET' })

            if (!res.ok) throw new Error(`Export başarısız (${res.status})`)

            const blob = await res.blob()
            const disposition = res.headers.get('Content-Disposition') ?? ''
            const match = disposition.match(/filename="?([^"]+)"?/)
            const filename = match?.[1] ?? `export.${format}`

            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (err) {
            console.error('Export hatası:', err)
            alert('Dışa aktarma sırasında hata oluştu.')
        } finally {
            setLoadingFmt(null)
        }
    }

    // Tek format ise dropdown gösterme, doğrudan tetikle
    if (formats.length === 1) {
        const format = formats[0]
        const meta = FORMAT_META[format]
        const Icon = meta.icon
        const busy = loadingFmt === format

        return (
            <button
                type="button"
                disabled={busy}
                onClick={() => handleExport(format)}
                className={cn('btn-secondary text-sm flex items-center gap-2', className)}
                aria-label={`${label} (${meta.label})`}
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {!iconOnly && <span>{busy ? 'Hazırlanıyor...' : `${label} ${format.toUpperCase()}`}</span>}
            </button>
        )
    }

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={loadingFmt !== null}
                className={cn('btn-secondary text-sm flex items-center gap-2', className)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                {loadingFmt
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Download className="w-4 h-4" />
                }
                {!iconOnly && <span>{loadingFmt ? 'Hazırlanıyor...' : label}</span>}
                {!loadingFmt && !iconOnly && <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 z-50 min-w-[180px] rounded-xl shadow-xl py-1.5 toast-enter"
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                    }}
                >
                    {formats.map(fmt => {
                        const meta = FORMAT_META[fmt]
                        const Icon = meta.icon
                        return (
                            <button
                                key={fmt}
                                type="button"
                                role="menuitem"
                                onClick={() => handleExport(fmt)}
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-info)' }} />
                                {meta.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
