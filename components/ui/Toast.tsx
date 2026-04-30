'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
    duration?: number
}

interface ToastContextValue {
    toast: (type: ToastType, message: string, duration?: number) => void
    dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>({
    toast: () => {},
    dismiss: () => {},
})

const ICONS: Record<ToastType, React.ElementType> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
}

const STYLES: Record<ToastType, string> = {
    success: 'border-[var(--accent-success-border)] bg-[var(--accent-success-bg)]',
    error: 'border-[var(--accent-danger-border)] bg-[var(--accent-danger-bg)]',
    warning: 'border-[var(--accent-warning-border)] bg-[var(--accent-warning-bg)]',
    info: 'border-[var(--accent-info-border)] bg-[var(--accent-info-bg)]',
}

const ICON_COLORS: Record<ToastType, string> = {
    success: 'text-[var(--accent-success)]',
    error: 'text-[var(--accent-danger)]',
    warning: 'text-[var(--accent-warning)]',
    info: 'text-[var(--accent-info)]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = crypto.randomUUID()
        setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }])

        if (duration > 0) {
            setTimeout(() => dismiss(id), duration)
        }
    }, [dismiss])

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => {
                    const Icon = ICONS[t.type]
                    return (
                        <div
                            key={t.id}
                            className={`toast-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-sm shadow-lg ${STYLES[t.type]}`}
                        >
                            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_COLORS[t.type]}`} />
                            <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                                {t.message}
                            </p>
                            <button
                                onClick={() => dismiss(t.id)}
                                className="btn-icon !w-6 !h-6 shrink-0 mt-0.5"
                                aria-label="Kapat"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
