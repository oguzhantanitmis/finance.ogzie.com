'use client'

import { ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
    INCOME: 'Gelir', EXPENSE: 'Gider', COLLECTION: 'Tahsilat', PAYMENT_TO_PERSON: 'Kişiye Ödeme',
    CARD_PAYMENT: 'Kart Ödeme', SUBSCRIPTION_PAYMENT: 'Abonelik', DEBT_PAYMENT: 'Borç Ödeme',
    TRANSFER: 'Transfer', BALANCE_ADJUSTMENT: 'Bakiye Düzeltme',
}

type Tone = 'success' | 'danger' | 'warning' | 'info'

function toneColor(tone: Tone) {
    if (tone === 'success') return 'var(--accent-success)'
    if (tone === 'danger') return 'var(--accent-danger)'
    if (tone === 'warning') return 'var(--accent-warning)'
    return 'var(--accent-info)'
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return (
        <div className="fintech-card p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: toneColor(tone) }}>{formatCurrency(value, 'TRY')}</p>
        </div>
    )
}

function CountKpi({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return (
        <div className="fintech-card p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: toneColor(tone) }}>{value}</p>
        </div>
    )
}

function ReportList({
    title,
    empty,
    rows,
}: {
    title: string
    empty: string
    rows: Array<{ key: string; title: string; subtitle: string; value: number; tone: Tone }>
}) {
    return (
        <div className="fintech-card p-5">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
            {rows.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{empty}</p>
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => (
                        <div key={row.key} className="flex items-center justify-between gap-4 border-b border-[var(--border-default)] pb-3 last:border-b-0 last:pb-0">
                            <div className="min-w-0">
                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{row.title}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{row.subtitle}</p>
                            </div>
                            <p className="font-bold privacy-blur tabular-nums" style={{ color: toneColor(row.tone) }}>{formatCurrency(row.value, 'TRY')}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

interface MonthlyData { month: string; income: number; expense: number; net: number; byCategory: { category: string; amount: number }[] }
interface ExpenseData { type: string; amount: number }
interface NetWorthData { date: string; netWorth: number; score: number }

interface Props {
    monthly: MonthlyData[]
    expenses: ExpenseData[]
    netWorthHistory: NetWorthData[]
    dashboard: {
        kpis: {
            income: number
            expense: number
            collections: number
            debtPayments: number
            cardPayments: number
            interestPaid: number
            kmhCost: number
            netCashFlow: number
            overdueCount: number
            upcomingCount: number
        }
        receivables: Array<{ id: string; person: string; title: string; remaining: number; overdueInstallments: number }>
        payables: Array<{ id: string; person: string; title: string; remaining: number; overdueInstallments: number }>
        cards: Array<{ id: string; name: string; bankName: string; currentDebt: number; utilization: number; minimumPayment: number; dueDate: string | null }>
        people: Array<{ id: string; name: string; receivable: number; payable: number; net: number }>
        marketRates: Array<{ id: string; code: string; buyRate: number | null; sellRate: number | null; rateDate: string }>
    } | null
}

export default function ReportsWorkspace({ monthly, expenses, netWorthHistory, dashboard }: Props) {
    const totalIncome = monthly.reduce((s, m) => s + m.income, 0)
    const totalExpense = monthly.reduce((s, m) => s + m.expense, 0)

    return (
        <div>
            {dashboard ? (
                <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                        <Kpi label="Bu ay gelir" value={dashboard.kpis.income} tone="success" />
                        <Kpi label="Bu ay gider" value={dashboard.kpis.expense} tone="danger" />
                        <Kpi label="Tahsilat" value={dashboard.kpis.collections} tone="success" />
                        <Kpi label="Borç ödemesi" value={dashboard.kpis.debtPayments} tone="danger" />
                        <Kpi label="Kart ödemeleri" value={dashboard.kpis.cardPayments} tone="warning" />
                        <Kpi label="Ödenen faiz" value={dashboard.kpis.interestPaid} tone="danger" />
                        <Kpi label="KMH maliyeti" value={dashboard.kpis.kmhCost} tone="warning" />
                        <Kpi label="Net nakit akışı" value={dashboard.kpis.netCashFlow} tone={dashboard.kpis.netCashFlow >= 0 ? 'success' : 'danger'} />
                        <CountKpi label="Geciken ödeme" value={dashboard.kpis.overdueCount} tone="danger" />
                        <CountKpi label="Yaklaşan ödeme" value={dashboard.kpis.upcomingCount} tone="info" />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <ReportList
                            title="Alacak raporu"
                            empty="Açık alacak yok."
                            rows={dashboard.receivables.slice(0, 6).map((item) => ({
                                key: item.id,
                                title: item.person,
                                subtitle: `${item.title}${item.overdueInstallments ? ` • ${item.overdueInstallments} geciken taksit` : ''}`,
                                value: item.remaining,
                                tone: 'success' as const,
                            }))}
                        />
                        <ReportList
                            title="Verecek / borç raporu"
                            empty="Açık verecek yok."
                            rows={dashboard.payables.slice(0, 6).map((item) => ({
                                key: item.id,
                                title: item.person,
                                subtitle: `${item.title}${item.overdueInstallments ? ` • ${item.overdueInstallments} geciken taksit` : ''}`,
                                value: item.remaining,
                                tone: 'danger' as const,
                            }))}
                        />
                        <ReportList
                            title="Kredi kartı raporu"
                            empty="Aktif kart borcu yok."
                            rows={dashboard.cards.slice(0, 6).map((item) => ({
                                key: item.id,
                                title: item.name,
                                subtitle: `${item.bankName} • Limit doluluk %${item.utilization}${item.dueDate ? ` • ${new Date(item.dueDate).toLocaleDateString('tr-TR')}` : ''}`,
                                value: item.currentDebt,
                                tone: item.utilization >= 80 ? 'danger' as const : 'warning' as const,
                            }))}
                        />
                    </div>
                </div>
            ) : null}

            {/* Özet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="w-4 h-4 text-[color:var(--accent-success)]" />
                        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Toplam Gelir (6 ay)</p>
                    </div>
                    <p className="text-2xl font-bold text-[color:var(--accent-success)] privacy-blur">{formatCurrency(totalIncome, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-danger)]" />
                        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Toplam Gider (6 ay)</p>
                    </div>
                    <p className="text-2xl font-bold text-[color:var(--accent-danger)] privacy-blur">{formatCurrency(totalExpense, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-[color:var(--accent-info)]" />
                        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Net (6 ay)</p>
                    </div>
                    <p className={cn('text-2xl font-bold privacy-blur', totalIncome - totalExpense >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                        {formatCurrency(totalIncome - totalExpense, 'TRY')}
                    </p>
                </div>
            </div>

            {/* Aylık Tablo */}
            <div className="fintech-card p-6 mb-6">
                <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Aylık Gelir-Gider</h2>
                {monthly.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Henüz yeterli veri yok.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-3 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Ay</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Gelir</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Gider</th>
                                    <th className="text-right py-3 text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)' }}>Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthly.map((m) => (
                                    <tr key={m.month} className="border-b border-[var(--border-subtle)]">
                                        <td className="py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{m.month}</td>
                                        <td className="py-3 text-right text-[color:var(--accent-success)] privacy-blur">{formatCurrency(m.income, 'TRY')}</td>
                                        <td className="py-3 text-right text-[color:var(--accent-danger)] privacy-blur">{formatCurrency(m.expense, 'TRY')}</td>
                                        <td className={cn('py-3 text-right font-semibold privacy-blur', m.net >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                                            {formatCurrency(m.net, 'TRY')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Son 30 Gün Harcama Kırılımı */}
                <div className="fintech-card p-6">
                    <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Son 30 Gün Harcama Dağılımı</h2>
                    {expenses.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Henüz harcama kaydı yok.</p>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map((e) => {
                                const maxAmount = expenses[0]?.amount ?? 1
                                const pct = Math.round((e.amount / maxAmount) * 100)
                                return (
                                    <div key={e.type}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{TYPE_LABELS[e.type] ?? e.type}</span>
                                            <span className="text-sm font-semibold privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(e.amount, 'TRY')}</span>
                                        </div>
                                        <div className="w-full h-2 bg-[var(--bg-hover)] rounded-full">
                                            <div className="h-full bg-red-400/60 rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Net Varlık Trendi */}
                <div className="fintech-card p-6">
                    <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Net Varlık Geçmişi</h2>
                    {netWorthHistory.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Henüz sağlık puanı geçmişi yok. Dashboard ziyaret edildikçe snapshot kaydedilir.</p>
                    ) : (
                        <div className="space-y-2">
                            {netWorthHistory.map((s, i) => (
                                <div key={i} className="flex items-center justify-between text-sm border-b border-[var(--border-subtle)] py-2">
                                    <span className="privacy-blur" style={{ color: 'var(--text-secondary)' }}>{new Date(s.date).toLocaleDateString('tr-TR')}</span>
                                    <div className="flex items-center gap-4">
                                        <span className={cn('font-semibold privacy-blur', s.netWorth >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                                            {formatCurrency(s.netWorth, 'TRY')}
                                        </span>
                                        <span className="text-xs privacy-blur" style={{ color: 'var(--text-muted)' }}>Skor: {s.score}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
