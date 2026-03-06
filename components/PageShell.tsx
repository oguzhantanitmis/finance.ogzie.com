import { cn } from '@/lib/utils'

interface PageShellProps {
    children: React.ReactNode
    width?: 'dar' | 'normal' | 'genis'
    className?: string
}

const WIDTH_CLASSNAMES: Record<NonNullable<PageShellProps['width']>, string> = {
    dar: 'max-w-5xl',
    normal: 'max-w-[1500px]',
    genis: 'max-w-[1820px]',
}

export default function PageShell({ children, width = 'genis', className }: PageShellProps) {
    return (
        <main className="min-w-0 pb-24 lg:pl-72">
            <div
                className={cn(
                    'mx-auto w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10 xl:px-12',
                    WIDTH_CLASSNAMES[width],
                    className,
                )}
            >
                {children}
            </div>
        </main>
    )
}
