import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import Link from 'next/link'

import type { MonthlyPaymentForecast, MonthlyPaymentItem } from '@/lib/finance-os-types'
import {
    formatBillingCycleLabel,
    formatCategoryLabel,
    formatMonthlyPaymentSourceLabel,
    formatMonthlyPaymentStatusLabel,
} from '@/lib/ui-text'
import { cn, formatCurrency, formatMonthInputValue } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
    PAID: 'text-emerald-400 bg-emerald-500/10',
    OPEN: 'text-sky-400 bg-sky-500/10',
    OVERDUE: 'text-red-400 bg-red-500/10',
    PLANNED: 'text-amber-400 bg-amber-500/10',
}

function PaymentDetail({ item }: { item: MonthlyPaymentItem }) {
    if (item.source === 'loan_installment') {
        return (
            <>
                <p className="text-sm text-zinc-400">Taksit no</p>
                <p className="text-sm font-medium text-white">{item.detail?.installmentNo ?? '-'}</p>
                <p className="text-sm text-zinc-400">Anapara</p>
                <p className="text-sm font-medium text-white">{formatCurrency(item.detail?.principalAmount ?? 0, item.currency)}</p>
                <p className="text-sm text-zinc-400">Faiz</p>
                <p className="text-sm font-medium text-white">{formatCurrency(item.detail?.interestAmount ?? 0, item.currency)}</p>
                <p className="text-sm text-zinc-400">Vergi</p>
                <p className="text-sm font-medium text-white">{formatCurrency(item.detail?.taxAmount ?? 0, item.currency)}</p>
                <p className="text-sm text-zinc-400">Durum</p>
                <p className="text-sm font-medium text-white">
                    {item.status === 'PAID' && item.detail?.paidDate
                        ? `${formatMonthlyPaymentStatusLabel(item.status)} • ${new Date(item.detail.paidDate).toLocaleDateString('tr-TR')}`
                        : formatMonthlyPaymentStatusLabel(item.status)}
                </p>
            </>
        )
    }

    if (item.source === 'card_statement') {
        return (
            <>
                <p className="text-sm text-zinc-400">Minimum ödeme</p>
                <p className="text-sm font-medium text-white">{formatCurrency(item.detail?.minimumPayment ?? item.amount, item.currency)}</p>
                <p className="text-sm text-zinc-400">Ekstre borcu</p>
                <p className="text-sm font-medium text-white">{formatCurrency(item.detail?.statementBalance ?? 0, item.currency)}</p>
                <p className="text-sm text-zinc-400">Ekstre durumu</p>
                <p className="text-sm font-medium text-white">{item.detail?.cardStatus ?? '-'}</p>
            </>
        )
    }

    if (item.source === 'subscription' || item.source === 'recurring') {
        return (
            <>
                <p className="text-sm text-zinc-400">Durum</p>
                <p className="text-sm font-medium text-white">Tahmini ödeme</p>
                <p className="text-sm text-zinc-400">Faturalama</p>
                <p className="text-sm font-medium text-white">{formatBillingCycleLabel(item.detail?.billingCycle ?? '')}</p>
                <p className="text-sm text-zinc-400">Autopay</p>
                <p className="text-sm font-medium text-white">{item.detail?.autopay ? 'Açık' : 'Kapalı'}</p>
                <p className="text-sm text-zinc-400">Kategori</p>
                <p className="text-sm font-medium text-white">{item.detail?.category ?? '-'}</p>
            </>
        )
    }

    return (
        <>
            <p className="text-sm text-zinc-400">Kategori</p>
            <p className="text-sm font-medium text-white">{formatCategoryLabel(item.detail?.category ?? '-')}</p>
            <p className="text-sm text-zinc-400">Durum</p>
            <p className="text-sm font-medium text-white">{formatMonthlyPaymentStatusLabel(item.status)}</p>
            <p className="text-sm text-zinc-400">Not</p>
            <p className="text-sm font-medium text-white">{item.detail?.note ?? 'Borç kaydı'}</p>
        </>
    )
}

export default function MonthlyPaymentsPanel({
    forecast,
    currentMonthHref,
    nextMonthHref,
    previousMonthHref,
    canGoPrevious,
    minMonth,
}: {
    forecast: MonthlyPaymentForecast
    currentMonthHref: string
    nextMonthHref: string
    previousMonthHref: string
    canGoPrevious: boolean
    minMonth: Date
}) {
    return (
        <div className="fintech-card p-6 md:p-7">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Seçili ay</p>
                    <h2 className="text-2xl font-bold">{format(forecast.month, 'LLLL yyyy', { locale: tr })} ödemeleri</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canGoPrevious ? (
                        <Link href={previousMonthHref} className="px-3 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5">
                            <ChevronLeft className="w-4 h-4" />
                        </Link>
                    ) : (
                        <span className="px-3 py-2 rounded-xl border border-white/5 text-zinc-700">
                            <ChevronLeft className="w-4 h-4" />
                        </span>
                    )}
                    <form method="get" className="flex items-center gap-2">
                        <input
                            type="month"
                            name="month"
                            min={formatMonthInputValue(minMonth)}
                            defaultValue={formatMonthInputValue(forecast.month)}
                            className="bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                        />
                        <button type="submit" className="px-3 py-2 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/5">
                            Git
                        </button>
                    </form>
                    <Link href={nextMonthHref} className="px-3 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5">
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link href={currentMonthHref} className="px-3 py-2 rounded-xl border border-white/10 text-sm text-zinc-300 hover:bg-white/5">
                        Bu ay
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam</p>
                    <p className="font-bold text-white privacy-blur">{formatCurrency(forecast.totalScheduled, 'TRY')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Açık</p>
                    <p className="font-bold text-sky-400 privacy-blur">{formatCurrency(forecast.totalOpen, 'TRY')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Gecikmiş</p>
                    <p className="font-bold text-red-400 privacy-blur">{formatCurrency(forecast.totalOverdue, 'TRY')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Tahmini</p>
                    <p className="font-bold text-amber-400 privacy-blur">{formatCurrency(forecast.totalPlanned, 'TRY')}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Ödendi</p>
                    <p className="font-bold text-emerald-400 privacy-blur">{formatCurrency(forecast.totalPaid, 'TRY')}</p>
                </div>
            </div>

            {forecast.items.length === 0 ? (
                <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-8 text-center text-zinc-400">
                    Seçili ay için planlanan ödeme görünmüyor.
                </div>
            ) : (
                <div className="space-y-3">
                    {forecast.items.map((item) => (
                        <details key={item.id} className="rounded-3xl border border-white/8 bg-white/[0.03] px-4 py-4 group">
                            <summary className="list-none cursor-pointer">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <CalendarClock className="w-4 h-4 text-zinc-500" />
                                            <span className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                                {formatMonthlyPaymentSourceLabel(item.source)}
                                            </span>
                                            <span className={cn('text-xs px-2 py-1 rounded-lg', STATUS_STYLES[item.status])}>
                                                {formatMonthlyPaymentStatusLabel(item.status)}
                                            </span>
                                        </div>
                                        <p className="font-semibold truncate">{item.name}</p>
                                        <p className="text-sm text-zinc-500">
                                            {new Date(item.dueDate).toLocaleDateString('tr-TR')}
                                            {item.detail?.category ? ` • ${formatCategoryLabel(item.detail.category)}` : ''}
                                            {item.isEstimated ? ' • Tahmini kayıt' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-500">Tutar</p>
                                            <p className="font-bold text-white privacy-blur">{formatCurrency(item.amount, item.currency)}</p>
                                        </div>
                                        <span className="text-xs text-zinc-600 group-open:rotate-180 transition-transform">⌄</span>
                                    </div>
                                </div>
                            </summary>
                            <div className="mt-4 pt-4 border-t border-white/8">
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                                    <PaymentDetail item={item} />
                                </div>
                                {item.navigateHref ? (
                                    <Link href={item.navigateHref} className="inline-flex items-center gap-2 text-sm text-white hover:text-zinc-300">
                                        Detaya git
                                    </Link>
                                ) : null}
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </div>
    )
}
