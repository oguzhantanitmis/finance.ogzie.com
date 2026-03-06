import { formatDistanceToNowStrict } from 'date-fns'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarClock, Landmark, ShieldAlert, Sparkles, Wallet } from 'lucide-react'
import Link from 'next/link'

import AIHeader from '@/components/AIHeader'
import InsightFeed from '@/components/InsightFeed'
import Navbar from '@/components/Navbar'
import SummaryCards from '@/components/SummaryCards'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { syncBudgetAlerts } from '@/lib/reminder-engine'
import { getCurrentUser } from '@/lib/server-auth'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function Home() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)
    const alerts = await syncBudgetAlerts(user.id, summary)
    const insights = await prisma.aIInsight.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
    })

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />

            <main className="md:ml-72 p-6 md:p-10 max-w-7xl mx-auto">
                <header className="mb-10">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finance OS</p>
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Aylik kontrol merkezi</h1>
                            <p className="text-zinc-400 max-w-3xl">
                                Gelir, sabit gider, abonelik ve borc baskisini tek ekranda gor. Onumuzdeki 14 gunun
                                odeme akisini buradan yonet.
                            </p>
                        </div>
                        <div className="fintech-card px-6 py-5 min-w-[280px] bg-gradient-to-br from-emerald-500/10 to-black">
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Free Cash</p>
                            <p className={`text-3xl font-bold ${summary.freeCash < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatCurrency(summary.freeCash, 'TRY')}
                            </p>
                            <p className="text-sm text-zinc-400 mt-2">Bu ay sabit yuklerden sonra kalan alan</p>
                        </div>
                    </div>
                </header>

                <AIHeader
                    summary={`Bu ay planlanan gelir ${formatCurrency(summary.plannedIncome, 'TRY')}, sabit yuk ${formatCurrency(summary.fixedCommitments, 'TRY')}, borc baskisi ${formatCurrency(summary.debtCommitments, 'TRY')}.`}
                />

                <InsightFeed insights={insights} />

                <SummaryCards
                    data={{
                        plannedIncome: summary.plannedIncome,
                        fixedCommitments: summary.fixedCommitments,
                        debtCommitments: summary.debtCommitments,
                        freeCash: summary.freeCash,
                    }}
                />

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-6 mt-6">
                    <div className="space-y-6">
                        <div className="fintech-card p-6 md:p-7">
                            <div className="flex items-center justify-between gap-4 mb-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Upcoming 14 Days</p>
                                    <h2 className="text-2xl font-bold">Yaklasan Odemeler</h2>
                                </div>
                                <CalendarClock className="w-5 h-5 text-zinc-500" />
                            </div>
                            {summary.upcomingObligations.length === 0 ? (
                                <p className="text-zinc-400">Onumuzdeki 14 gunde zorlayici bir odeme yok.</p>
                            ) : (
                                <div className="space-y-3">
                                    {summary.upcomingObligations.slice(0, 8).map((obligation) => (
                                        <div key={`${obligation.source}-${obligation.id}`} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="font-semibold truncate">{obligation.name}</p>
                                                <p className="text-sm text-zinc-500 truncate">
                                                    {obligation.category} • {formatDistanceToNowStrict(new Date(obligation.dueDate), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">{formatCurrency(obligation.amount, obligation.currency)}</p>
                                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{obligation.source}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="fintech-card p-6 bg-gradient-to-br from-zinc-950 to-black">
                                <div className="flex items-center gap-3 mb-4">
                                    <Landmark className="w-5 h-5 text-amber-400" />
                                    <h3 className="font-semibold">Abonelik Yuk</h3>
                                </div>
                                <p className="text-3xl font-bold">{formatCurrency(summary.subscriptionLoad, 'TRY')}</p>
                                <p className="text-sm text-zinc-400 mt-2">Aylik normalize abonelik etkisi</p>
                                <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                                    Aboneliklere git <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="fintech-card p-6 bg-gradient-to-br from-zinc-950 to-black">
                                <div className="flex items-center gap-3 mb-4">
                                    <Wallet className="w-5 h-5 text-sky-400" />
                                    <h3 className="font-semibold">Sabit Gider Yuk</h3>
                                </div>
                                <p className="text-3xl font-bold">{formatCurrency(summary.recurringLoad, 'TRY')}</p>
                                <p className="text-sm text-zinc-400 mt-2">Kira, fatura, sigorta ve diger duzenli odemeler</p>
                                <Link href="/recurring" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                                    Sabit giderleri ac <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="fintech-card p-6 md:p-7">
                            <div className="flex items-center justify-between gap-4 mb-5">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Live Alerts</p>
                                    <h2 className="text-2xl font-bold">Kritik Sinyaller</h2>
                                </div>
                                <ShieldAlert className="w-5 h-5 text-red-400" />
                            </div>
                            {alerts.length === 0 ? (
                                <p className="text-zinc-400">Acik uyari yok. Sistem dengede.</p>
                            ) : (
                                <div className="space-y-3">
                                    {alerts.map((alert) => (
                                        <div key={alert.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{alert.type}</p>
                                            <h3 className="font-semibold mb-1">{alert.title}</h3>
                                            <p className="text-sm text-zinc-400">{alert.content}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="fintech-card p-6 md:p-7">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-2xl font-bold">Sistem Onerisi</h2>
                            </div>
                            <p className="text-zinc-300 leading-7">
                                {summary.incomeSources.length === 0
                                    ? 'Butce merkezi daha saglikli calissin diye once duzenli gelirlerini ekle. Gelir kaydi olmadan serbest nakit hesaplari eksik kalir.'
                                    : summary.freeCash < 0
                                        ? 'Bu ay eksiye dusuyorsun. Sabit giderlerden kritik olmayanlari ayris, yillik yenilemeleri kontrol et ve kredi karti minimum odemelerini yeniden planla.'
                                        : `Onumuzdeki 14 gunde ${summary.upcomingObligations.length} odeme var. Buffer hedefini ${formatCurrency(Math.max(summary.fixedCommitments * 0.2, 0), 'TRY')} bandina cekmek mantikli.`}
                            </p>
                            <Link href="/budget" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                                Butce merkezine gec <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
