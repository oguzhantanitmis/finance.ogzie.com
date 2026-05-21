import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'critical'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    /** Rendered slot below the description. Can be a button, link, form, etc. */
    action?: ReactNode
    /** Convenience: render a primary link as the action. */
    cta?: { label: string; href: string }
    tone?: Tone
    className?: string
    /** When true, removes the surrounding fintech-card wrapper so it can sit inside another card. */
    bare?: boolean
}

const TONE_BG: Record<Tone, string> = {
    neutral: 'var(--bg-elevated)',
    success: 'var(--accent-success-bg)',
    warning: 'var(--accent-warning-bg)',
    danger: 'var(--accent-danger-bg)',
    info: 'var(--accent-info-bg)',
    purple: 'var(--accent-purple-bg)',
    critical: 'var(--accent-critical-bg)',
}

const TONE_FG: Record<Tone, string> = {
    neutral: 'var(--text-muted)',
    success: 'var(--accent-success)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)',
    info: 'var(--accent-info)',
    purple: 'var(--accent-purple)',
    critical: 'var(--accent-critical)',
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    cta,
    tone = 'neutral',
    className,
    bare = false,
}: EmptyStateProps) {
    return (
        <div className={cn('empty-state', !bare && 'fintech-card', className)}>
            <div
                className="empty-state-icon"
                style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
                aria-hidden
            >
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="empty-state-title">{title}</h3>
            {description ? <p className="empty-state-description">{description}</p> : null}
            {cta ? (
                <Link href={cta.href} className="btn-primary mt-4">
                    {cta.label}
                </Link>
            ) : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    )
}
