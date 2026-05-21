import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'danger' | 'critical' | 'info' | 'auto'
type Size = 'sm' | 'md' | 'lg'

interface UtilizationRingProps {
    value: number
    max?: number
    tone?: Tone
    size?: Size
    className?: string
    label?: string
    sublabel?: string
    thresholds?: { warning: number; danger: number; critical: number }
}

const DIM: Record<Size, { box: number; stroke: number; font: string; sub: string }> = {
    sm: { box: 64, stroke: 6, font: 'text-sm', sub: 'text-[9px]' },
    md: { box: 96, stroke: 8, font: 'text-lg', sub: 'text-[10px]' },
    lg: { box: 128, stroke: 10, font: 'text-2xl', sub: 'text-[11px]' },
}

type SolidTone = Exclude<Tone, 'auto'>

function resolveTone(value: number, tone: Tone, thresholds?: UtilizationRingProps['thresholds']): SolidTone {
    if (tone !== 'auto') return tone
    const t = thresholds ?? { warning: 50, danger: 75, critical: 90 }
    if (value >= t.critical) return 'critical'
    if (value >= t.danger) return 'danger'
    if (value >= t.warning) return 'warning'
    return 'success'
}

const STROKE: Record<SolidTone, string> = {
    success: 'var(--accent-success)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)',
    critical: 'var(--accent-critical)',
    info: 'var(--accent-info)',
}

export default function UtilizationRing({
    value,
    max = 100,
    tone = 'auto',
    size = 'md',
    className,
    label,
    sublabel,
    thresholds,
}: UtilizationRingProps) {
    const clampedMax = max <= 0 ? 1 : max
    const percent = Math.max(0, Math.min(100, (value / clampedMax) * 100))
    const resolved = resolveTone(percent, tone, thresholds)

    const dim = DIM[size]
    const radius = (dim.box - dim.stroke) / 2
    const circumference = 2 * Math.PI * radius
    const dash = (percent / 100) * circumference

    return (
        <div
            className={cn('relative inline-flex items-center justify-center shrink-0', className)}
            style={{ width: dim.box, height: dim.box }}
            role="img"
            aria-label={`${label ?? 'Kullanım'}: %${Math.round(percent)}`}
        >
            <svg width={dim.box} height={dim.box} viewBox={`0 0 ${dim.box} ${dim.box}`} className="-rotate-90">
                <circle
                    cx={dim.box / 2}
                    cy={dim.box / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--bg-elevated)"
                    strokeWidth={dim.stroke}
                />
                <circle
                    cx={dim.box / 2}
                    cy={dim.box / 2}
                    r={radius}
                    fill="none"
                    stroke={STROKE[resolved]}
                    strokeWidth={dim.stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('font-bold tabular-nums', dim.font)} style={{ color: 'var(--text-primary)' }}>
                    %{Math.round(percent)}
                </span>
                {sublabel ? (
                    <span className={cn('font-semibold uppercase tracking-[0.15em]', dim.sub)} style={{ color: 'var(--text-muted)' }}>
                        {sublabel}
                    </span>
                ) : null}
            </div>
        </div>
    )
}
