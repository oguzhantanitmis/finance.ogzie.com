'use client'

import { useEffect } from 'react'
import { AlertTriangle, Database, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

function classifyError(message: string | undefined): 'connection' | 'unknown' {
    if (!message) return 'unknown'
    const m = message.toLowerCase()
    if (
        m.includes("can't reach database") ||
        m.includes('econnrefused') ||
        m.includes('etimedout') ||
        m.includes('connection refused') ||
        m.includes('prismaclientinitial')
    ) {
        return 'connection'
    }
    return 'unknown'
}

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('App Error:', error)
    }, [error])

    const kind = classifyError(error.message)
    const isConn = kind === 'connection'

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
            <div className="max-w-md w-full text-center">
                <div
                    className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{
                        background: isConn ? 'var(--accent-warning-bg)' : 'var(--accent-danger-bg)',
                        border: `1px solid ${isConn ? 'var(--accent-warning-border)' : 'var(--accent-danger-border)'}`,
                    }}
                >
                    {isConn
                        ? <Database className="w-8 h-8" style={{ color: 'var(--accent-warning)' }} />
                        : <AlertTriangle className="w-8 h-8" style={{ color: 'var(--accent-danger)' }} />
                    }
                </div>

                <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {isConn ? 'Veritabanı geçici olarak erişilemez' : 'Bir hata oluştu'}
                </h2>
                <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
                    {isConn
                        ? 'Veritabanı sunucusuna anlık olarak ulaşılamıyor. Birkaç saniye sonra tekrar deneyin — sistem otomatik yeniden bağlanmayı dener.'
                        : 'Beklenmeyen bir sorun oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.'}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tekrar Dene
                    </button>
                    <Link
                        href="/"
                        className="btn-secondary w-full py-3 inline-flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Ana Sayfa
                    </Link>
                </div>

                {error.digest && (
                    <p className="text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
                        Hata kodu: <span className="font-mono">{error.digest}</span>
                    </p>
                )}
            </div>
        </div>
    )
}
