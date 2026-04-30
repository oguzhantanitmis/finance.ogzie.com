'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Yakalanan hata:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="fintech-card p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-7 h-7 text-[color:var(--accent-danger)]" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Bir hata oluştu</h3>
                    <p className="text-zinc-400 text-sm mb-4 max-w-md mx-auto">
                        Bu bileşen yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin veya tekrar deneyin.
                    </p>
                    {this.state.error && (
                        <p className="text-xs text-zinc-600 mb-4 font-mono bg-[var(--bg-hover)] p-3 rounded-xl max-w-md mx-auto overflow-auto">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={this.handleReset}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tekrar Dene
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
