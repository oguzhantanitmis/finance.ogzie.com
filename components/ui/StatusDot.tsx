import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'critical' | 'neutral'

interface StatusDotProps {
    tone: StatusTone
    size?: 'xs' | 'sm' | 'md'
    pulsing?: boolean
    className?: string
    label?: string
}

const TONE: Record<StatusTone, string> = {
    success: 'var(--accent-success)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-info)',
    purple: 'var(--accent-purple)',
    critical: 'var(--accent-critical)',
    neutral: 'var(--text-muted)',
}

const SIZE: Record<NonNullable<StatusDotProps['size']>, string> = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
}

export default function StatusDot({ tone, size = 'sm', pulsing = false, className, label }: StatusDotProps) {
    return (
        <span
            role={label ? 'status' : undefined}
            aria-label={label}
            className={cn('inline-block rounded-full shrink-0', SIZE[size], pulsing && 'animate-pulse', className)}
            style={{ background: TONE[tone] }}
        />
    )
}
