'use client'

import { AlertTriangle, Database, RefreshCw } from 'lucide-react'

export default function TransactionsErrorBanner({ kind }: { kind: 'connection' | 'unknown' }) {
    const isConn = kind === 'connection'
    return (
        <div
            className="mb-6 rounded-2xl p-4 flex items-start gap-3"
            style={{
                background: isConn ? 'var(--accent-warning-bg)' : 'var(--accent-danger-bg)',
                border: `1px solid ${isConn ? 'var(--accent-warning-border)' : 'var(--accent-danger-border)'}`,
            }}
            role="alert"
        >
            {isConn
                ? <Database className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-warning)' }} />
                : <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-danger)' }} />
            }
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: isConn ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>
                    {isConn ? 'Veritabanına anlık olarak ulaşılamadı' : 'İşlemler yüklenemedi'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {isConn
                        ? 'Veriler şu an boş gösteriliyor. Sayfayı yenileyince tekrar denenir.'
                        : 'Beklenmeyen bir sorun çıktı. Sayfayı yenileyin.'}
                </p>
            </div>
            <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
            >
                <RefreshCw className="w-3.5 h-3.5" />
                Yenile
            </button>
        </div>
    )
}
