import { cn } from '@/lib/utils'

type Tone = 'success' | 'danger' | 'warning' | 'purple' | 'info' | 'critical'

interface ProgressBarProps {
    value: number
    max?: number
    tone?: Tone
    className?: string
    label?: string
    showValue?: boolean
}

const TONE_CLASS: Record<Tone, string> = {
    success: 'progress-bar-success',
    danger: 'progress-bar-danger',
    warning: 'progress-bar-warning',
    purple: 'progress-bar-purple',
    info: 'progress-bar-info',
    critical: 'progress-bar-danger',
}

export default function ProgressBar({ value, max = 100, tone = 'info', className, label, showValue = false }: ProgressBarProps) {
    const clampedMax = max <= 0 ? 1 : max
    const percent = Math.max(0, Math.min(100, (value / clampedMax) * 100))

    return (
        <div className={cn('w-full', className)}>
            {(label || showValue) && (
                <div className="flex items-center justify-between text-xs mb-1.5">
                    {label ? <span style={{ color: 'var(--text-secondary)' }}>{label}</span> : <span />}
                    {showValue ? (
                        <span className="tabular-nums font-semibold" style={{ color: 'var(--text-primary)' }}>
                            %{Math.round(percent)}
                        </span>
                    ) : null}
                </div>
            )}
            <div
                className={cn('progress-bar', TONE_CLASS[tone])}
                role="progressbar"
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
            >
                <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}
