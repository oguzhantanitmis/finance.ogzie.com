import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface SectionHeaderProps {
    eyebrow?: string
    title: string
    description?: string
    icon?: LucideIcon
    iconTone?: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'critical' | 'neutral'
    actions?: ReactNode
    filters?: ReactNode
    className?: string
    as?: 'h1' | 'h2' | 'h3'
    size?: 'sm' | 'md' | 'lg'
}

const TONE_BG: Record<NonNullable<SectionHeaderProps['iconTone']>, string> = {
    success: 'var(--accent-success-bg)',
    danger: 'var(--accent-danger-bg)',
    warning: 'var(--accent-warning-bg)',
    info: 'var(--accent-info-bg)',
    purple: 'var(--accent-purple-bg)',
    critical: 'var(--accent-critical-bg)',
    neutral: 'var(--bg-elevated)',
}

const TONE_FG: Record<NonNullable<SectionHeaderProps['iconTone']>, string> = {
    success: 'var(--accent-success)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-info)',
    purple: 'var(--accent-purple)',
    critical: 'var(--accent-critical)',
    neutral: 'var(--text-muted)',
}

const TITLE_SIZE: Record<NonNullable<SectionHeaderProps['size']>, string> = {
    sm: 'text-lg md:text-xl font-bold',
    md: 'text-xl md:text-2xl font-bold',
    lg: 'text-2xl md:text-3xl font-bold tracking-tight',
}

export default function SectionHeader({
    eyebrow,
    title,
    description,
    icon: Icon,
    iconTone = 'neutral',
    actions,
    filters,
    className,
    as: HeadingTag = 'h2',
    size = 'md',
}: SectionHeaderProps) {
    return (
        <header className={cn('flex flex-col gap-4', className)}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                    {Icon ? (
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: TONE_BG[iconTone] }}
                            aria-hidden
                        >
                            <Icon className="w-5 h-5" style={{ color: TONE_FG[iconTone] }} />
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        {eyebrow ? (
                            <p
                                className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-semibold mb-1.5"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {eyebrow}
                            </p>
                        ) : null}
                        <HeadingTag className={TITLE_SIZE[size]} style={{ color: 'var(--text-primary)' }}>
                            {title}
                        </HeadingTag>
                        {description ? (
                            <p className="mt-1.5 text-sm md:text-[15px] max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
                {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
            </div>
            {filters ? <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">{filters}</div> : null}
        </header>
    )
}
