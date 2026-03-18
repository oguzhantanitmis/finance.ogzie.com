import { formatDistanceToNowStrict } from 'date-fns'
import { tr } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarClock, Landmark, ShieldAlert, Sparkles, Wallet, TrendingUp, TrendingDown, Target, BookOpen, Users, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import AIHeader from '@/components/AIHeader'
import InsightFeed from '@/components/InsightFeed'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import SummaryCards from '@/components/SummaryCards'
import AIRecommendationWidget from '@/components/AIRecommendationWidget'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { syncBudgetAlerts } from '@/lib/reminder-engine'
import { getCurrentUser } from '@/lib/server-auth'
import { formatAlertTypeLabel, formatCategoryLabel, formatObligationSourceLabel } from '@/lib/ui-text'
import { formatCurrency, cn } from '@/lib/utils'
import { getDashboardData } from '@/lib/dashboard-service'
import { calculateHealthScore } from '@/lib/health-score-service'
import { getActiveGoalForDashboard } from '@/lib/goal-service'

export const dynamic = 'force-dynamic'

async function DashboardContent({ userId }: { userId: string }) {
    const summary = await getMonthlyBudgetSummary(userId)

    const defaultDashData: Awaited<ReturnType<typeof getDashboardData>> = {
        totalBalance: 0, availableCash: 0, totalDebt: 0, totalReceivable: 0,
        totalPayable: 0, netPosition: 0, totalCardDebt: 0, totalSubscriptionMonthly: 0,
        totalRecurringMonthly: 0, overdueCount: 0, recentTransactions: [], upcomingPayments: [],
    }
    const defaultHealth = {
        score: 0, level: 'MODERATE',
        breakdown: {
            creditUtilization: { score: 0, weight: 25, detail: 'Veri yok' },
            debtToIncomeRatio: { score: 0, weight: 20, detail: 'Veri yok' },
            minPaymentDependency: { score: 0, weight: 15, detail: 'Veri yok' },
            overduePayments: { score: 0, weight: 15, detail: 'Veri yok' },
            fixedExpenseRatio: { score: 0, weight: 15, detail: 'Veri yok' },
            monthlyCashSurplus: { score: 0, weight: 10, detail: 'Veri yok' },
        },
        improvements: ['Veriler yüklenemedi — veritabanı migration gerekli olabilir.'],
        trend: 'stable',
    }

    let dashData = defaultDashData
    let healthScore: any = defaultHealth
    let activeGoal: Awaited<ReturnType<typeof getActiveGoalForDashboard>> | null = null

    try {
        const [d, h, g] = await Promise.all([
            getDashboardData(userId).catch(() => defaultDashData),
            calculateHealthScore(userId).catch(() => defaultHealth),
            getActiveGoalForDashboard(userId).catch(() => null),
        ])
        dashData = d
        healthScore = h
        activeGoal = g
    } catch { /* tablolar yoksa sessizce devam */ }

    const alerts = await syncBudgetAlerts(userId, summary).catch(() => [])
    const insights = await prisma.aIInsight.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 3,
    }).catch(() => [])

    const aiRecommendations = await prisma.aIRecommendation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
            id: true, type: true, title: true, content: true,
            reasoning: true, suggestedAction: true, risk: true
        }
    }).catch(() => [])

    return (
        <div className="animate-in fade-in duration-500">
            <header className="mb-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Aylık kontrol merkezi</h1>
                        <p className="text-zinc-400 max-w-3xl">
                            Gelir, sabit gider, abonelik ve borç baskısını tek ekranda gör. Önümüzdeki 14 günün
                            ödeme akışını buradan yönet.
                        </p>
                    </div>
                    <div className="fintech-card px-6 py-5 min-w-0 w-full sm:w-auto sm:min-w-[320px] bg-gradient-to-br from-emerald-500/10 to-black">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Serbest nakit</p>
                        <p className={`text-3xl font-bold ${summary.freeCash < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(summary.freeCash, 'TRY')}
                        </p>
                        <p className="text-sm text-zinc-400 mt-2">Bu ay sabit yüklerden sonra kalan alan</p>
                    </div>
                </div>
            </header>

            <AIHeader
                summary={`Bu ay planlanan gelir ${formatCurrency(summary.plannedIncome, 'TRY')}, sabit yük ${formatCurrency(summary.fixedCommitments, 'TRY')}, borç baskısı ${formatCurrency(summary.debtCommitments, 'TRY')}.`}
            />

            <AIRecommendationWidget recommendations={aiRecommendations} />

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
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Önümüzdeki 14 gün</p>
                                <h2 className="text-2xl font-bold">Yaklaşan ödemeler</h2>
                            </div>
                            <CalendarClock className="w-5 h-5 text-zinc-500" />
                        </div>
                        {summary.upcomingObligations.length === 0 ? (
                            <p className="text-zinc-400">Önümüzdeki 14 günde zorlayıcı bir ödeme yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {summary.upcomingObligations.slice(0, 8).map((obligation) => (
                                    <div key={`${obligation.source}-${obligation.id}`} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate">{obligation.name}</p>
                                            <p className="text-sm text-zinc-500 truncate">
                                                {formatCategoryLabel(obligation.category)} • {formatDistanceToNowStrict(new Date(obligation.dueDate), { addSuffix: true, locale: tr })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(obligation.amount, obligation.currency)}</p>
                                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{formatObligationSourceLabel(obligation.source)}</p>
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
                                <h3 className="font-semibold">Abonelik yükü</h3>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(summary.subscriptionLoad, 'TRY')}</p>
                            <p className="text-sm text-zinc-400 mt-2">Aylık normalize abonelik etkisi</p>
                            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                                Aboneliklere git <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="fintech-card p-6 bg-gradient-to-br from-zinc-950 to-black">
                            <div className="flex items-center gap-3 mb-4">
                                <Wallet className="w-5 h-5 text-sky-400" />
                                <h3 className="font-semibold">Sabit gider yükü</h3>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(summary.recurringLoad, 'TRY')}</p>
                            <p className="text-sm text-zinc-400 mt-2">Kira, fatura, sigorta vb.</p>
                            <Link href="/recurring" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                                Sabit giderleri aç <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="fintech-card p-6 md:p-7">
                        <div className="flex items-center justify-between gap-4 mb-5">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Canlı uyarılar</p>
                                <h2 className="text-2xl font-bold">Kritik sinyaller</h2>
                            </div>
                            <ShieldAlert className="w-5 h-5 text-red-400" />
                        </div>
                        {alerts.length === 0 ? (
                            <p className="text-zinc-400">Açık uyarı yok. Sistem dengede.</p>
                        ) : (
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{formatAlertTypeLabel(alert.type)}</p>
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
                            <h2 className="text-2xl font-bold">Sistem önerisi</h2>
                        </div>
                        <p className="text-zinc-300 leading-7">
                            {summary.incomeSources.length === 0
                                ? 'Bütçe merkezi daha sağlıklı çalışsın diye önce düzenli gelirlerini ekle. Gelir kaydı olmadan serbest nakit hesapları eksik kalır.'
                                : summary.freeCash < 0
                                    ? 'Bu ay eksiye düşüyorsun. Sabit giderlerden kritik olmayanları ayır, yıllık yenilemeleri kontrol et ve kredi kartı minimum ödemelerini yeniden planla.'
                                    : `Önümüzdeki 14 günde ${summary.upcomingObligations.length} ödeme var. Tampon hedefini ${formatCurrency(Math.max(summary.fixedCommitments * 0.2, 0), 'TRY')} bandına çekmek mantıklı.`}
                        </p>
                        <Link href="/budget" className="inline-flex items-center gap-2 text-sm text-white mt-5">
                            Bütçe merkezine geç <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Finansal Genel Bakış */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-8">
                <div className="fintech-card p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-1">Toplam Bakiye</p>
                    <p className={cn('text-lg font-bold', dashData.totalBalance < 0 ? 'text-red-400' : 'text-white')}>
                        {formatCurrency(dashData.totalBalance, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-1">Kullanılabilir Nakit</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashData.availableCash, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Alacak</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashData.totalReceivable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <ArrowUpRight className="w-3 h-3 text-red-400" />
                        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Verecek</p>
                    </div>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(dashData.totalPayable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-1">Kart Borcu</p>
                    <p className="text-lg font-bold text-amber-400">{formatCurrency(dashData.totalCardDebt, 'TRY')}</p>
                </div>
                <div className="fintech-card p-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mb-1">Net Pozisyon</p>
                    <p className={cn('text-lg font-bold', dashData.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(dashData.netPosition, 'TRY')}
                    </p>
                </div>
            </div>

            {/* Sağlık Puanı + Aktif Hedef + Son İşlemler */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-sky-400" />
                            <h3 className="font-semibold">Finansal Sağlık</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {healthScore.trend === 'improving' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                            {healthScore.trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-400" />}
                            <span className={cn(
                                'text-xs uppercase tracking-[0.25em] px-2 py-0.5 rounded-lg',
                                healthScore.score >= 80 ? 'text-emerald-400 bg-emerald-500/10' :
                                healthScore.score >= 60 ? 'text-sky-400 bg-sky-500/10' :
                                healthScore.score >= 40 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10'
                            )}>
                                {healthScore.level === 'EXCELLENT' ? 'Mükemmel' : healthScore.level === 'GOOD' ? 'İyi' : healthScore.level === 'MODERATE' ? 'Orta' : healthScore.level === 'HIGH' ? 'Yüksek Risk' : 'Kritik'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative w-28 h-28">
                            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle cx="50" cy="50" r="42" fill="none"
                                    stroke={healthScore.score >= 80 ? '#34d399' : healthScore.score >= 60 ? '#38bdf8' : healthScore.score >= 40 ? '#fbbf24' : '#f87171'}
                                    strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={`${healthScore.score * 2.64} 264`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{healthScore.score}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {healthScore.improvements.map((tip: string, i: number) => (
                            <p key={i} className="text-xs text-zinc-400 leading-relaxed">• {tip}</p>
                        ))}
                    </div>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Target className="w-5 h-5 text-purple-400" />
                        <h3 className="font-semibold">Aktif Hedef</h3>
                    </div>
                    {activeGoal ? (
                        <div>
                            <h4 className="font-semibold text-white mb-2">{activeGoal.title}</h4>
                            {activeGoal.description && <p className="text-xs text-zinc-500 mb-3">{activeGoal.description}</p>}
                            <div className="w-full h-3 bg-white/5 rounded-full mb-3">
                                <div className="h-full bg-purple-400 rounded-full transition-all" style={{ width: `${activeGoal.progressPercent}%` }} />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">{formatCurrency(activeGoal.currentAmount, 'TRY')}</span>
                                <span className="font-semibold text-white">{formatCurrency(activeGoal.targetAmount, 'TRY')}</span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-2">%{activeGoal.progressPercent} tamamlandı</p>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-zinc-500 text-sm mb-3">Henüz aktif hedef yok</p>
                            <Link href="/goals" className="text-sm text-purple-400 hover:text-purple-300">Hedef ekle →</Link>
                        </div>
                    )}
                    <Link href="/goals" className="inline-flex items-center gap-2 text-sm text-white mt-4">
                        Tüm hedefler <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-zinc-400" />
                            <h3 className="font-semibold">Son İşlemler</h3>
                        </div>
                        <Link href="/transactions" className="text-xs text-zinc-500 hover:text-white">Tümü →</Link>
                    </div>
                    {dashData.recentTransactions.length === 0 ? (
                        <p className="text-zinc-500 text-sm">Henüz işlem kaydı yok.</p>
                    ) : (
                        <div className="space-y-2">
                            {dashData.recentTransactions.slice(0, 6).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-sm">
                                    <div className="min-w-0">
                                        <p className="text-zinc-300 truncate">{tx.description || tx.type}</p>
                                        <p className="text-xs text-zinc-600">{new Date(tx.date).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <span className={cn('font-semibold tabular-nums shrink-0', tx.amount > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
                <Link href="/accounts" className="fintech-card p-4 flex items-center gap-3 hover:border-white/20 transition-all">
                    <Landmark className="w-5 h-5 text-sky-400" />
                    <span className="font-semibold text-sm">Hesaplar</span>
                </Link>
                <Link href="/people" className="fintech-card p-4 flex items-center gap-3 hover:border-white/20 transition-all">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold text-sm">Kişiler</span>
                </Link>
                <Link href="/payment-plan" className="fintech-card p-4 flex items-center gap-3 hover:border-white/20 transition-all">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-sm">Ödeme Planı</span>
                </Link>
                <Link href="/goals" className="fintech-card p-4 flex items-center gap-3 hover:border-white/20 transition-all">
                    <Target className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-sm">Hedefler</span>
                </Link>
            </div>
        </div>
    )
}

function DashboardSkeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <header className="mb-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <div className="w-32 h-4 bg-white/10 rounded mb-3" />
                        <div className="w-64 md:w-96 h-10 bg-white/10 rounded mb-3" />
                        <div className="w-full max-w-2xl h-6 bg-white/10 rounded" />
                    </div>
                    <div className="w-full sm:w-[320px] h-32 bg-white/5 rounded-3xl" />
                </div>
            </header>
            
            <div className="w-full h-24 bg-white/5 rounded-3xl" />
            <div className="w-full h-48 bg-white/5 rounded-3xl" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="h-32 bg-white/5 rounded-3xl" />
                <div className="h-32 bg-white/5 rounded-3xl" />
                <div className="h-32 bg-white/5 rounded-3xl" />
                <div className="h-32 bg-white/5 rounded-3xl" />
            </div>
            
            <div className="w-full h-8 flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    <span className="text-xs font-mono text-zinc-500">Veritabanı Senkronize Ediliyor...</span>
                </div>
            </div>
        </div>
    )
}

export default async function Home() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />
            <PageShell width="genis">
                <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardContent userId={user.id} />
                </Suspense>
            </PageShell>
        </div>
    )
}
