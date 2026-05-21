import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, ShieldCheck, TimerReset } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export type RiskLevel =
    | 'low'
    | 'medium'
    | 'high'
    | 'critical'
    | 'closed'
    | 'overdue'
    | 'due_today'

interface RiskBadgeProps {
    level: RiskLevel
    label?: string
    className?: string
    size?: 'sm' | 'md'
    showIcon?: boolean
}

const META: Record<RiskLevel, { label: string; icon: LucideIcon; badge: string; iconClass: string }> = {
    low: {
        label: 'Düşük',
        icon: ShieldCheck,
        badge: 'status-badge-success',
        iconClass: 'text-[var(--accent-success)]',
    },
    medium: {
        label: 'Orta',
        icon: CircleDashed,
        badge: 'status-badge-info',
        iconClass: 'text-[var(--accent-info)]',
    },
    high: {
        label: 'Yüksek',
        icon: AlertTriangle,
        badge: 'status-badge-warning',
        iconClass: 'text-[var(--accent-warning)]',
    },
    critical: {
        label: 'Kritik',
        icon: AlertOctagon,
        badge: 'status-badge-critical',
        iconClass: 'text-[var(--accent-critical)]',
    },
    closed: {
        label: 'Kapalı',
        icon: CheckCircle2,
        badge: 'status-badge-neutral',
        iconClass: 'text-[var(--text-muted)]',
    },
    overdue: {
        label: 'Gecikmiş',
        icon: TimerReset,
        badge: 'status-badge-danger',
        iconClass: 'text-[var(--accent-danger)]',
    },
    due_today: {
        label: 'Bugün vadeli',
        icon: CalendarClock,
        badge: 'status-badge-warning',
        iconClass: 'text-[var(--accent-warning)]',
    },
}

export default function RiskBadge({
    level,
    label,
    className,
    size = 'md',
    showIcon = true,
}: RiskBadgeProps) {
    const meta = META[level]
    const Icon = meta.icon
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

    return (
        <span className={cn('status-badge', meta.badge, className)} aria-label={`Risk: ${label ?? meta.label}`}>
            {showIcon ? <Icon className={cn(iconSize, meta.iconClass)} aria-hidden /> : null}
            {label ?? meta.label}
        </span>
    )
}
