import { cn, formatCurrency } from '@/lib/utils'

type Intent = 'positive' | 'negative' | 'neutral' | 'auto'
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'hero'

interface MoneyAmountProps {
    value: number
    currency?: string
    intent?: Intent
    size?: Size
    className?: string
    showSign?: boolean
    sensitive?: boolean
}

const SIZE_CLASS: Record<Size, string> = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold',
    hero: 'text-3xl md:text-4xl font-bold',
}

function colorFor(intent: Intent, value: number): string | undefined {
    const resolved: Intent =
        intent === 'auto'
            ? value > 0
                ? 'positive'
                : value < 0
                    ? 'negative'
                    : 'neutral'
            : intent

    switch (resolved) {
        case 'positive':
            return 'var(--accent-success)'
        case 'negative':
            return 'var(--accent-danger)'
        case 'neutral':
            return 'var(--text-primary)'
    }
}

export default function MoneyAmount({
    value,
    currency = 'TRY',
    intent = 'neutral',
    size = 'md',
    className,
    showSign = false,
    sensitive = true,
}: MoneyAmountProps) {
    const formatted = formatCurrency(Math.abs(value), currency)
    const prefix = value < 0 ? '-' : showSign && value > 0 ? '+' : ''

    return (
        <span
            className={cn('tabular-nums', sensitive && 'privacy-blur', SIZE_CLASS[size], className)}
            style={{ color: colorFor(intent, value) }}
        >
            {prefix}
            {formatted}
        </span>
    )
}
