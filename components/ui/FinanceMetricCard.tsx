import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import MoneyAmount from './MoneyAmount'

type Accent = 'default' | 'success' | 'danger' | 'warning' | 'purple' | 'info' | 'critical'
type Intent = 'positive' | 'negative' | 'neutral' | 'auto'
type Size = 'sm' | 'md' | 'lg' | 'hero'

interface FinanceMetricCardProps {
    label: string
    value: number
    currency?: string
    accent?: Accent
    intent?: Intent
    icon?: LucideIcon
    eyebrow?: string
    helperText?: string
    trend?: { direction: 'up' | 'down' | 'flat'; label: string }
    href?: string
    cta?: { label: string; href: string }
    size?: Size
    className?: string
    children?: ReactNode
    sensitive?: boolean
    showSign?: boolean
}

const ACCENT_CLASS: Record<Accent, string> = {
    default: '',
    success: 'kpi-card-success',
    danger: 'kpi-card-danger',
    warning: 'kpi-card-warning',
    purple: 'kpi-card-purple',
    info: 'kpi-card-info',
    critical: 'kpi-card-critical',
}

const ACCENT_TONE_BG: Record<Accent, string> = {
    default: 'var(--bg-elevated)',
    success: 'var(--accent-success-bg)',
    danger: 'var(--accent-danger-bg)',
    warning: 'var(--accent-warning-bg)',
    purple: 'var(--accent-purple-bg)',
    info: 'var(--accent-info-bg)',
    critical: 'var(--accent-critical-bg)',
}

const ACCENT_TONE_FG: Record<Accent, string> = {
    default: 'var(--text-muted)',
    success: 'var(--accent-success)',
    danger: 'var(--accent-danger)',
    warning: 'var(--accent-warning)',
    purple: 'var(--accent-purple)',
    info: 'var(--accent-info)',
    critical: 'var(--accent-critical)',
}

const VALUE_SIZE: Record<Size, Size extends never ? never : 'sm' | 'md' | 'lg' | 'xl' | 'hero'> = {
    sm: 'lg',
    md: 'xl',
    lg: 'xl',
    hero: 'hero',
}

const LABEL_CLASS: Record<Size, string> = {
    sm: 'text-[10px] tracking-[0.15em]',
    md: 'text-[11px] tracking-[0.18em]',
    lg: 'text-xs tracking-[0.2em]',
    hero: 'text-xs tracking-[0.25em]',
}

export default function FinanceMetricCard({
    label,
    value,
    currency = 'TRY',
    accent = 'default',
    intent = 'neutral',
    icon: Icon,
    eyebrow,
    helperText,
    trend,
    href,
    cta,
    size = 'md',
    className,
    children,
    sensitive = true,
    showSign = false,
}: FinanceMetricCardProps) {
    const TrendIcon = trend
        ? trend.direction === 'up'
            ? TrendingUp
            : trend.direction === 'down'
                ? TrendingDown
                : Minus
        : null

    const trendColor = trend
        ? trend.direction === 'up'
            ? 'var(--accent-success)'
            : trend.direction === 'down'
                ? 'var(--accent-danger)'
                : 'var(--text-muted)'
        : undefined

    const wrapperClass = cn(
        'kpi-card flex flex-col gap-3',
        ACCENT_CLASS[accent],
        href ? 'cursor-pointer fintech-card-interactive' : null,
        className,
    )

    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    {eyebrow ? (
                        <p className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: 'var(--text-muted)' }}>
                            {eyebrow}
                        </p>
                    ) : null}
                    <p className={cn('font-semibold uppercase', LABEL_CLASS[size])} style={{ color: 'var(--text-muted)' }}>
                        {label}
                    </p>
                </div>
                {Icon ? (
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ACCENT_TONE_BG[accent] }}
                        aria-hidden
                    >
                        <Icon className="w-4 h-4" style={{ color: ACCENT_TONE_FG[accent] }} />
                    </div>
                ) : null}
            </div>

            <MoneyAmount
                value={value}
                currency={currency}
                intent={intent}
                size={VALUE_SIZE[size]}
                sensitive={sensitive}
                showSign={showSign}
            />

            {trend ? (
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: trendColor }}>
                    {TrendIcon ? <TrendIcon className="w-3.5 h-3.5" aria-hidden /> : null}
                    <span>{trend.label}</span>
                </div>
            ) : null}

            {helperText ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {helperText}
                </p>
            ) : null}

            {children}

            {cta ? (
                <Link
                    href={cta.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium mt-auto"
                    style={{ color: 'var(--accent-primary)' }}
                >
                    {cta.label} →
                </Link>
            ) : null}
        </>
    )

    if (href) {
        return (
            <Link href={href} className={wrapperClass}>
                {body}
            </Link>
        )
    }

    return <div className={wrapperClass}>{body}</div>
}
