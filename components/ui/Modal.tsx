'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'

interface ModalProps {
    title: string
    children: ReactNode
    onClose: () => void
    subtitle?: string
    size?: Size
    /** @deprecated use `size` instead — retained for backwards compatibility */
    maxWidthClassName?: string
    closeOnOverlayClick?: boolean
    hideClose?: boolean
}

const SIZE_CLASS: Record<Size, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '4xl': 'max-w-6xl',
}

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
    title,
    children,
    onClose,
    subtitle,
    size = 'md',
    maxWidthClassName,
    closeOnOverlayClick = true,
    hideClose = false,
}: ModalProps) {
    const titleId = useId()
    const subtitleId = useId()
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.stopPropagation()
                onClose()
                return
            }

            if (event.key !== 'Tab' || !containerRef.current) return
            const focusables = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            if (focusables.length === 0) {
                event.preventDefault()
                return
            }
            const first = focusables[0]
            const last = focusables[focusables.length - 1]
            const active = document.activeElement as HTMLElement | null

            if (event.shiftKey && active === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && active === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        const id = window.setTimeout(() => {
            const focusables = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            const first = focusables?.[0]
            if (first) {
                first.focus()
            } else {
                containerRef.current?.focus()
            }
        }, 0)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            window.clearTimeout(id)
            document.body.style.overflow = previousOverflow
            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus()
            }
        }
    }, [onClose])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={closeOnOverlayClick ? onClose : undefined}
                aria-hidden
            />
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={subtitle ? subtitleId : undefined}
                tabIndex={-1}
                className={cn(
                    'relative w-full fintech-card fintech-card-elevated p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto outline-none toast-enter',
                    maxWidthClassName ?? SIZE_CLASS[size],
                )}
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            {title}
                        </h2>
                        {subtitle ? (
                            <p id={subtitleId} className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                {subtitle}
                            </p>
                        ) : null}
                    </div>
                    {!hideClose ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-icon shrink-0"
                            aria-label="Pencereyi kapat"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>
                {children}
            </div>
        </div>
    )
}
