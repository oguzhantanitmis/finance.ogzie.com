'use client'

import { AlertTriangle, Database, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DebtsErrorState({ isConnectionError }: { isConnectionError: boolean }) {
    return (
        <div className="fintech-card p-10 text-center max-w-2xl mx-auto">
            <div
                className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{
                    background: isConnectionError ? 'var(--accent-warning-bg)' : 'var(--accent-danger-bg)',
                    border: `1px solid ${isConnectionError ? 'var(--accent-warning-border)' : 'var(--accent-danger-border)'}`,
                }}
            >
                {isConnectionError
                    ? <Database className="w-8 h-8" style={{ color: 'var(--accent-warning)' }} />
                    : <AlertTriangle className="w-8 h-8" style={{ color: 'var(--accent-danger)' }} />
                }
            </div>

            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                {isConnectionError ? 'Veritabanı geçici olarak erişilemez' : 'Borç verileri yüklenemedi'}
            </h2>

            <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
                {isConnectionError
                    ? 'Veritabanı sunucusuna anlık olarak ulaşılamıyor. Birkaç saniye sonra tekrar deneyin.'
                    : 'Borç verileri okunurken beklenmeyen bir sorun çıktı. Sayfayı yenileyin veya ana sayfaya dönün.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary inline-flex items-center justify-center gap-2 px-6"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tekrar Dene
                </button>
                <Link
                    href="/"
                    className="btn-secondary inline-flex items-center justify-center gap-2 px-6"
                >
                    <Home className="w-4 h-4" />
                    Ana Sayfa
                </Link>
            </div>
        </div>
    )
}
