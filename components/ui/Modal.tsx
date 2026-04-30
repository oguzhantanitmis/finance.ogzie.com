'use client'

import type { ReactNode } from 'react'

interface ModalProps {
    title: string
    children: ReactNode
    onClose: () => void
    subtitle?: string
    maxWidthClassName?: string
}

export default function Modal({
    title,
    children,
    onClose,
    subtitle,
    maxWidthClassName = 'max-w-xl',
}: ModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${maxWidthClassName} fintech-card p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
                        {subtitle ? <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p> : null}
                    </div>
                    <button onClick={onClose} className="transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }} aria-label="Pencereyi kapat">
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
