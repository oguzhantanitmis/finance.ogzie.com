'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

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

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Bir hata oluştu</h2>
                <p className="text-zinc-400 text-sm mb-8">
                    Beklenmeyen bir sorun oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={reset}
                        className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tekrar Dene
                    </button>
                    <Link
                        href="/"
                        className="w-full border border-white/10 py-4 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Ana Sayfa
                    </Link>
                </div>
                {error.digest && (
                    <p className="text-xs text-zinc-600 mt-6">Hata kodu: {error.digest}</p>
                )}
            </div>
        </div>
    )
}
