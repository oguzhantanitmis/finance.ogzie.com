import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { cn, formatCurrency } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface MoneyDeltaProps {
    value: number
    currency?: string
    size?: Size
    showIcon?: boolean
    className?: string
    sensitive?: boolean
}

const SIZE: Record<Size, { text: string; icon: string }> = {
    sm: { text: 'text-xs', icon: 'w-3 h-3' },
    md: { text: 'text-sm', icon: 'w-3.5 h-3.5' },
    lg: { text: 'text-base', icon: 'w-4 h-4' },
}

export default function MoneyDelta({
    value,
    currency = 'TRY',
    size = 'md',
    showIcon = true,
    className,
    sensitive = true,
}: MoneyDeltaProps) {
    const sizing = SIZE[size]
    const isZero = value === 0
    const isPositive = value > 0
    const color = isZero
        ? 'var(--text-muted)'
        : isPositive
            ? 'var(--accent-success)'
            : 'var(--accent-danger)'

    const Icon = isZero ? Minus : isPositive ? ArrowUpRight : ArrowDownRight
    const sign = isPositive ? '+' : value < 0 ? '-' : ''
    const formatted = formatCurrency(Math.abs(value), currency)

    return (
        <span
            className={cn('inline-flex items-center gap-1 font-semibold tabular-nums', sensitive && 'privacy-blur', sizing.text, className)}
            style={{ color }}
        >
            {showIcon ? <Icon className={cn(sizing.icon, 'shrink-0')} aria-hidden /> : null}
            {sign}
            {formatted}
        </span>
    )
}
