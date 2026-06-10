import { formatDistanceToNowStrict } from 'date-fns'
import { tr } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarClock, Landmark, ShieldAlert, Sparkles, Wallet, TrendingUp, TrendingDown, Target, BookOpen, Users, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import AIHeader from '@/components/AIHeader'
import AIQuickAction from '@/components/AIQuickAction'
import DashboardInsights from '@/components/DashboardInsights'
import MarketTicker from '@/components/MarketTicker'
import PageShell from '@/components/PageShell'
import SummaryCards from '@/components/SummaryCards'
import { getDashboardInsights } from '@/lib/dashboard-insights'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { syncBudgetAlerts } from '@/lib/reminder-engine'
import { getCurrentUser } from '@/lib/server-auth'
import { formatAlertTypeLabel, formatCategoryLabel, formatObligationSourceLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'
import { getDashboardData } from '@/lib/dashboard-service'
import { getMarketTicker, type MarketTickerResult } from '@/lib/evds-service'
import { calculateHealthScore, type HealthScoreResult } from '@/lib/health-score-service'
import { getActiveGoalForDashboard } from '@/lib/goal-service'
import { isSuperuser } from '@/lib/authz'

export const dynamic = 'force-dynamic'

async function DashboardContent({ userId, canUseAi }: { userId: string; canUseAi: boolean }) {
    const defaultSummary = {
        plannedIncome: 0, fixedCommitments: 0,
        debtCommitments: 0, subscriptionLoad: 0, recurringLoad: 0,
        freeCash: 0, upcomingObligations: [], incomeSources: [],
    } as unknown as Awaited<ReturnType<typeof getMonthlyBudgetSummary>>

    let summary = defaultSummary
    try {
        summary = await getMonthlyBudgetSummary(userId)
    } catch { /* sessizce devam */ }

    const defaultDashData: Awaited<ReturnType<typeof getDashboardData>> = {
        totalBalance: 0, availableCash: 0, totalDebt: 0, totalReceivable: 0,
        totalPayable: 0, netPosition: 0, totalCardDebt: 0, totalSubscriptionMonthly: 0,
        totalRecurringMonthly: 0, overdueCount: 0, recentTransactions: [], upcomingPayments: [],
    }
    const defaultHealth: HealthScoreResult = {
        score: 0, level: 'MODERATE',
        isReady: false,
        breakdown: {
            creditUtilization: { score: 0, weight: 25, detail: 'Veri yok' },
            debtToIncomeRatio: { score: 0, weight: 20, detail: 'Veri yok' },
            minPaymentDependency: { score: 0, weight: 15, detail: 'Veri yok' },
            overduePayments: { score: 0, weight: 15, detail: 'Veri yok' },
            fixedExpenseRatio: { score: 0, weight: 15, detail: 'Veri yok' },
            monthlyCashSurplus: { score: 0, weight: 10, detail: 'Veri yok' },
        },
        improvements: ['Veriler yüklenemedi — veritabanı bağlantı hatası.'],
        trend: 'stable',
    }

    let dashData = defaultDashData
    let healthScore: HealthScoreResult = defaultHealth
    let activeGoal: Awaited<ReturnType<typeof getActiveGoalForDashboard>> | null = null
    let marketTicker: MarketTickerResult = {
        status: 'missing_key',
        message: 'Piyasa verisi anahtarı girilmedi.',
        lastUpdatedAt: null,
        cacheMinutes: 180,
        items: [],
    }

    try {
        const [d, h, g, m] = await Promise.all([
            getDashboardData(userId).catch(() => defaultDashData),
            calculateHealthScore(userId).catch(() => defaultHealth),
            getActiveGoalForDashboard(userId).catch(() => null),
            getMarketTicker(userId).catch(() => marketTicker),
        ])
        dashData = d
        healthScore = h
        activeGoal = g
        marketTicker = m
    } catch { /* tablolar yoksa sessizce devam */ }

    const alerts = await syncBudgetAlerts(userId, summary).catch(() => [])
    const insights = await getDashboardInsights(userId, {
        summary,
        dashboardData: dashData,
        healthScore,
        activeGoal,
    }).catch(() => [])

    return (
        <div className="animate-fade-in-up">
            <header className="mb-10">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>Finans paneli</p>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>Aylık kontrol merkezi</h1>
                        <p className="max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
                            Gelir, sabit gider, abonelik ve borç baskısını tek ekranda gör. Önümüzdeki 14 günün
                            ödeme akışını buradan yönet.
                        </p>
                    </div>
                    <div className="kpi-card kpi-card-success px-6 py-5 min-w-0 w-full sm:w-auto sm:min-w-[320px]">
                        <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Serbest nakit</p>
                        <p className="text-3xl font-bold privacy-blur" style={{ color: summary.freeCash < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                            {formatCurrency(summary.freeCash, 'TRY')}
                        </p>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Bu ay sabit yüklerden sonra kalan alan</p>
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                {canUseAi ? (
                    <AIHeader
                        canUseAi
                        summary={`Bu ay planlanan gelir ${formatCurrency(summary.plannedIncome, 'TRY')}, sabit yük ${formatCurrency(summary.fixedCommitments, 'TRY')}, borç baskısı ${formatCurrency(summary.debtCommitments, 'TRY')}.`}
                    />
                ) : null}

                <MarketTicker ticker={marketTicker} canRefresh={canUseAi} />

                <DashboardInsights insights={insights} />

                {canUseAi ? (
                    <AIQuickAction />
                ) : null}

                <SummaryCards
                    data={{
                        plannedIncome: summary.plannedIncome,
                        fixedCommitments: summary.fixedCommitments,
                        debtCommitments: summary.debtCommitments,
                        freeCash: summary.freeCash,
                    }}
                />
            </div>

            <div className="space-y-6 mt-6">
                <div className="space-y-6">
                    <div className="fintech-card p-6 md:p-7">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Önümüzdeki 14 gün</p>
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Yaklaşan ödemeler</h2>
                            </div>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-warning-bg)' }}>
                                <CalendarClock className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                            </div>
                        </div>
                        {summary.upcomingObligations.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Önümüzdeki 14 günde zorlayıcı bir ödeme yok.</p>
                        ) : (
                            <div className="space-y-3">
                                {summary.upcomingObligations.slice(0, 8).map((obligation) => (
                                    <div key={`${obligation.source}-${obligation.id}`} className="rounded-2xl px-4 py-4 flex items-center justify-between gap-4 transition-colors" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-hover)' }}>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{obligation.name}</p>
                                            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                                                {formatCategoryLabel(obligation.category)} • {formatDistanceToNowStrict(new Date(obligation.dueDate), { addSuffix: true, locale: tr })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(obligation.amount, obligation.currency)}</p>
                                            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>{formatObligationSourceLabel(obligation.source)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="kpi-card kpi-card-warning">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-warning-bg)' }}>
                                    <Landmark className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                                </div>
                                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Abonelik yükü</h3>
                            </div>
                            <p className="text-3xl font-bold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary.subscriptionLoad, 'TRY')}</p>
                            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Aylık normalize abonelik etkisi</p>
                            <Link href="/subscriptions" className="inline-flex items-center gap-2 text-sm font-medium mt-5 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                                Aboneliklere git <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="kpi-card kpi-card-info">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-info-bg)' }}>
                                    <Wallet className="w-4 h-4" style={{ color: 'var(--accent-info)' }} />
                                </div>
                                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Sabit gider yükü</h3>
                            </div>
                            <p className="text-3xl font-bold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(summary.recurringLoad, 'TRY')}</p>
                            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Kira, fatura, sigorta vb.</p>
                            <Link href="/recurring" className="inline-flex items-center gap-2 text-sm font-medium mt-5 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                                Sabit giderleri aç <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="fintech-card p-6 md:p-7">
                        <div className="flex items-center justify-between gap-4 mb-5">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Canlı uyarılar</p>
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Kritik sinyaller</h2>
                            </div>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-danger-bg)' }}>
                                <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent-danger)' }} />
                            </div>
                        </div>
                        {alerts.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Açık uyarı yok. Sistem dengede.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-hover)' }}>
                                        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>{formatAlertTypeLabel(alert.type)}</p>
                                        <h3 className="text-sm font-semibold mb-0.5 leading-snug" style={{ color: 'var(--text-primary)' }}>{alert.title}</h3>
                                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{alert.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="fintech-card p-6 md:p-7">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-success-bg)' }}>
                                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                            </div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Sistem önerisi</h2>
                        </div>
                        <p className="leading-7 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {summary.incomeSources.length === 0
                                ? 'Bütçe merkezi daha sağlıklı çalışsın diye önce düzenli gelirlerini ekle. Gelir kaydı olmadan serbest nakit hesapları eksik kalır.'
                                : summary.freeCash < 0
                                    ? 'Bu ay eksiye düşüyorsun. Sabit giderlerden kritik olmayanları ayır, yıllık yenilemeleri kontrol et ve kredi kartı minimum ödemelerini yeniden planla.'
                                    : `Önümüzdeki 14 günde ${summary.upcomingObligations.length} ödeme var. Tampon hedefini ${formatCurrency(Math.max(summary.fixedCommitments * 0.2, 0), 'TRY')} bandına çekmek mantıklı.`}
                        </p>
                        <Link href="/budget" className="inline-flex items-center gap-2 text-sm font-medium mt-5 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                            Bütçe merkezine geç <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Finansal Genel Bakış */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-8 stagger-children">
                <div className="kpi-card">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Toplam Bakiye</p>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: dashData.totalBalance < 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(dashData.totalBalance, 'TRY')}
                    </p>
                </div>
                <div className="kpi-card kpi-card-success">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Kullanılabilir Nakit</p>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-success)' }}>{formatCurrency(dashData.availableCash, 'TRY')}</p>
                </div>
                <div className="kpi-card kpi-card-success">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ArrowDownLeft className="w-3 h-3" style={{ color: 'var(--accent-success)' }} />
                        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--text-muted)' }}>Alacak</p>
                    </div>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-success)' }}>{formatCurrency(dashData.totalReceivable, 'TRY')}</p>
                </div>
                <div className="kpi-card kpi-card-danger">
                    <div className="flex items-center gap-1.5 mb-1">
                        <ArrowUpRight className="w-3 h-3" style={{ color: 'var(--accent-danger)' }} />
                        <p className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--text-muted)' }}>Verecek</p>
                    </div>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-danger)' }}>{formatCurrency(dashData.totalPayable, 'TRY')}</p>
                </div>
                <div className="kpi-card kpi-card-warning">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Kart Borcu</p>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: 'var(--accent-warning)' }}>{formatCurrency(dashData.totalCardDebt, 'TRY')}</p>
                </div>
                <div className="kpi-card">
                    <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Net Pozisyon</p>
                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: dashData.netPosition >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {formatCurrency(dashData.netPosition, 'TRY')}
                    </p>
                </div>
            </div>

            {/* Sağlık Puanı + Aktif Hedef + Son İşlemler */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-info-bg)' }}>
                                <Activity className="w-4 h-4" style={{ color: 'var(--accent-info)' }} />
                            </div>
                            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Finansal Sağlık</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {healthScore.isReady && healthScore.trend === 'improving' && <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />}
                            {healthScore.isReady && healthScore.trend === 'declining' && <TrendingDown className="w-4 h-4" style={{ color: 'var(--accent-danger)' }} />}
                            <span className="status-badge status-badge-neutral">
                                {!healthScore.isReady
                                    ? 'Veri Yetersiz'
                                    : healthScore.level === 'EXCELLENT' ? 'Mükemmel' : healthScore.level === 'GOOD' ? 'İyi' : healthScore.level === 'MODERATE' ? 'Orta' : healthScore.level === 'HIGH' ? 'Yüksek Risk' : 'Kritik'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative w-28 h-28 gauge-animated">
                            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
                                <circle cx="50" cy="50" r="42" fill="none"
                                    stroke={!healthScore.isReady ? 'var(--text-muted)' : healthScore.score >= 80 ? 'var(--accent-success)' : healthScore.score >= 60 ? 'var(--accent-info)' : healthScore.score >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)'}
                                    strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={`${healthScore.score * 2.64} 264`}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold privacy-blur" style={{ color: 'var(--text-primary)' }}>{healthScore.isReady ? healthScore.score : '--'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {healthScore.improvements.map((tip: string, i: number) => (
                            <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>• {tip}</p>
                        ))}
                    </div>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-purple-bg)' }}>
                            <Target className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aktif Hedef</h3>
                    </div>
                    {activeGoal ? (
                        <div>
                            <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{activeGoal.title}</h4>
                            {activeGoal.description && <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{activeGoal.description}</p>}
                            <div className="progress-bar progress-bar-purple mb-3">
                                <div className="progress-bar-fill" style={{ width: `${activeGoal.progressPercent}%` }} />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="privacy-blur tabular-nums" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(activeGoal.currentAmount, 'TRY')}</span>
                                <span className="font-semibold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatCurrency(activeGoal.targetAmount, 'TRY')}</span>
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>%{activeGoal.progressPercent} tamamlandı</p>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Henüz aktif hedef yok</p>
                            <Link href="/goals" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent-purple)' }}>Hedef ekle →</Link>
                        </div>
                    )}
                    <Link href="/goals" className="inline-flex items-center gap-2 text-sm font-medium mt-4 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                        Tüm hedefler <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                                <BookOpen className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Son İşlemler</h3>
                        </div>
                        <Link href="/transactions" className="text-xs font-medium cursor-pointer" style={{ color: 'var(--text-muted)' }}>Tümü →</Link>
                    </div>
                    {dashData.recentTransactions.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Henüz işlem kaydı yok.</p>
                    ) : (
                        <div className="space-y-2">
                            {dashData.recentTransactions.slice(0, 6).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate" style={{ color: 'var(--text-primary)' }}>{tx.description || tx.type}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <span className="font-semibold tabular-nums shrink-0 privacy-blur" style={{ color: tx.amount > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
                <Link href="/accounts" className="fintech-card-interactive fintech-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-info-bg)' }}>
                        <Landmark className="w-4 h-4" style={{ color: 'var(--accent-info)' }} />
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Hesaplar</span>
                </Link>
                <Link href="/people" className="fintech-card-interactive fintech-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-warning-bg)' }}>
                        <Users className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Kişiler</span>
                </Link>
                <Link href="/payment-plan" className="fintech-card-interactive fintech-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-danger-bg)' }}>
                        <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent-danger)' }} />
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Ödeme Planı</span>
                </Link>
                <Link href="/goals" className="fintech-card-interactive fintech-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-purple-bg)' }}>
                        <Target className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Hedefler</span>
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
                        <div className="w-32 h-4 rounded mb-3" style={{ background: 'var(--bg-elevated)' }} />
                        <div className="w-64 md:w-96 h-10 rounded mb-3" style={{ background: 'var(--bg-elevated)' }} />
                        <div className="w-full max-w-2xl h-6 rounded" style={{ background: 'var(--bg-elevated)' }} />
                    </div>
                    <div className="w-full sm:w-[320px] h-32 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />
                </div>
            </header>
            <div className="w-full h-24 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl" style={{ background: 'var(--bg-elevated)' }} />)}
            </div>
            <div className="w-full h-8 flex justify-center mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Senkronize ediliyor...</span>
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
        <PageShell width="genis">
            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent userId={user.id} canUseAi={isSuperuser(user)} />
            </Suspense>
        </PageShell>
    )
}
