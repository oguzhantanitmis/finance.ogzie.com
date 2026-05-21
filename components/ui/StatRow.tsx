import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Tone = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'critical' | 'muted'

interface StatRowProps {
    label: string
    value: ReactNode
    icon?: LucideIcon
    tone?: Tone
    hint?: string
    className?: string
}

const TONE_COLOR: Record<Tone, string | undefined> = {
    default: undefined,
    success: 'var(--accent-success)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    info: 'var(--accent-info)',
    purple: 'var(--accent-purple)',
    critical: 'var(--accent-critical)',
    muted: 'var(--text-muted)',
}

export default function StatRow({ label, value, icon: Icon, tone = 'default', hint, className }: StatRowProps) {
    return (
        <div className={cn('metric-row', className)}>
            <span className="metric-row-label">
                {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: TONE_COLOR[tone] ?? 'var(--text-muted)' }} aria-hidden /> : null}
                <span className="truncate">
                    {label}
                    {hint ? <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span> : null}
                </span>
            </span>
            <span className="metric-row-value" style={tone !== 'default' ? { color: TONE_COLOR[tone] } : undefined}>
                {value}
            </span>
        </div>
    )
}
