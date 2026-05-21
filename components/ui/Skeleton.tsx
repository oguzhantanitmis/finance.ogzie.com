import { cn } from '@/lib/utils'

type Variant = 'text' | 'title' | 'paragraph' | 'card' | 'kpi' | 'avatar' | 'pill'

interface SkeletonProps {
    variant?: Variant
    className?: string
    lines?: number
}

const VARIANT_CLASS: Record<Variant, string> = {
    text: 'h-3 w-32 rounded',
    title: 'h-6 w-48 rounded',
    paragraph: 'h-3 w-full rounded',
    card: 'h-32 w-full rounded-2xl',
    kpi: 'h-28 w-full rounded-2xl',
    avatar: 'h-10 w-10 rounded-full',
    pill: 'h-6 w-20 rounded-full',
}

export default function Skeleton({ variant = 'text', className, lines = 1 }: SkeletonProps) {
    const base = cn('animate-shimmer', VARIANT_CLASS[variant], className)
    const style = { background: 'var(--bg-elevated)' }

    if (variant === 'paragraph' && lines > 1) {
        return (
            <div className="space-y-2" aria-hidden>
                {Array.from({ length: lines }).map((_, idx) => (
                    <div
                        key={idx}
                        className={cn('animate-shimmer h-3 rounded', idx === lines - 1 ? 'w-2/3' : 'w-full', className)}
                        style={style}
                    />
                ))}
            </div>
        )
    }

    return <div className={base} style={style} aria-hidden />
}
