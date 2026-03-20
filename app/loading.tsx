import PageShell from '@/components/PageShell'

export default function Loading() {
    return (
        <PageShell width="genis">
            <div className="animate-pulse space-y-6">
                <div>
                    <div className="h-4 w-28 rounded bg-white/10 mb-3" />
                    <div className="h-10 w-72 rounded bg-white/10 mb-3" />
                    <div className="h-5 w-full max-w-2xl rounded bg-white/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="h-32 rounded-3xl bg-white/5" />
                    <div className="h-32 rounded-3xl bg-white/5" />
                    <div className="h-32 rounded-3xl bg-white/5" />
                    <div className="h-32 rounded-3xl bg-white/5" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="h-72 rounded-3xl bg-white/5" />
                    <div className="h-72 rounded-3xl bg-white/5" />
                </div>
            </div>
        </PageShell>
    )
}
