import { cn } from '@/lib/utils'

interface PageShellProps {
    children: React.ReactNode
    width?: 'dar' | 'normal' | 'genis'
    className?: string
    title?: string
    description?: string
}

const WIDTH_CLASSNAMES: Record<NonNullable<PageShellProps['width']>, string> = {
    dar: 'max-w-5xl',
    normal: 'max-w-[1500px]',
    genis: 'max-w-[1820px]',
}

export default function PageShell({ children, width = 'genis', className, title, description }: PageShellProps) {
    return (
        <div className="min-w-0">
            <div
                className={cn(
                    'mx-auto w-full px-4 py-6 sm:px-6 md:px-8 lg:px-10 xl:px-12',
                    WIDTH_CLASSNAMES[width],
                    className,
                )}
            >
                {(title || description) && (
                    <div className="mb-6 md:mb-8">
                        {title && (
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                {title}
                            </h1>
                        )}
                        {description && (
                            <p className="mt-1.5 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
                                {description}
                            </p>
                        )}
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}
