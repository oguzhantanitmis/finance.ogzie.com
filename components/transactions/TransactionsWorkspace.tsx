'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, ReceiptText, Settings, Search } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

const TYPE_META: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
    INCOME: { label: 'Gelir', icon: ArrowDownLeft, color: 'text-emerald-400' },
    EXPENSE: { label: 'Gider', icon: ArrowUpRight, color: 'text-red-400' },
    COLLECTION: { label: 'Tahsilat', icon: ArrowDownLeft, color: 'text-emerald-400' },
    PAYMENT_TO_PERSON: { label: 'Kişiye Ödeme', icon: ArrowUpRight, color: 'text-red-400' },
    CARD_PAYMENT: { label: 'Kart Ödeme', icon: CreditCard, color: 'text-red-400' },
    SUBSCRIPTION_PAYMENT: { label: 'Abonelik', icon: ReceiptText, color: 'text-red-400' },
    DEBT_PAYMENT: { label: 'Borç Ödeme', icon: ArrowUpRight, color: 'text-red-400' },
    DEBT_ADDITION: { label: 'Borç Ekleme', icon: ArrowUpRight, color: 'text-amber-400' },
    RECEIVABLE_ADDITION: { label: 'Alacak Ekleme', icon: ArrowDownLeft, color: 'text-sky-400' },
    TRANSFER: { label: 'Transfer', icon: ArrowLeftRight, color: 'text-sky-400' },
    BALANCE_ADJUSTMENT: { label: 'Bakiye Düzeltme', icon: Settings, color: 'text-zinc-400' },
}

interface EntryData {
    id: string
    type: string
    amount: number
    currency: string
    description: string | null
    category: string | null
    date: string
    account: { name: string } | null
    sourceLabel: string | null
    sourceHref: string | null
}

interface Props {
    entries: EntryData[]
    totalIncome: number
    totalExpense: number
    total: number
}

export default function TransactionsWorkspace({ entries, totalIncome, totalExpense, total }: Props) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    const filtered = entries.filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (search && !(e.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div>
            {/* Özet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Giriş</p>
                    <p className="text-2xl font-bold text-emerald-400 privacy-blur">{formatCurrency(totalIncome, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Çıkış</p>
                    <p className="text-2xl font-bold text-red-400 privacy-blur">{formatCurrency(totalExpense, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Kayıt</p>
                    <p className="text-2xl font-bold text-white">{total}</p>
                </div>
            </div>

            {/* Filtreler */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="İşlem ara..."
                        className="w-full bg-black border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white text-sm"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-sm"
                >
                    <option value="all">Tüm Tipler</option>
                    {Object.entries(TYPE_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                    ))}
                </select>
            </div>

            {/* İşlem Listesi */}
            {filtered.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    {entries.length === 0 ? 'Henüz işlem kaydı yok.' : 'Bu filtreye uygun işlem bulunamadı.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((entry) => {
                        const meta = TYPE_META[entry.type] ?? TYPE_META.BALANCE_ADJUSTMENT
                        const Icon = meta.icon
                        const isPositive = entry.amount > 0
                        return (
                            <div key={entry.id} className="fintech-card p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center bg-white/5', meta.color)}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{entry.description || meta.label}</p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span>{meta.label}</span>
                                            {entry.account && <span>• {entry.account.name}</span>}
                                            <span className="privacy-blur">• {new Date(entry.date).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        {entry.sourceHref && entry.sourceLabel ? (
                                            <Link
                                                href={entry.sourceHref}
                                                className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white mt-2"
                                            >
                                                {entry.sourceLabel} →
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                                <p className={cn('font-bold tabular-nums privacy-blur', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                                    {isPositive ? '+' : ''}{formatCurrency(entry.amount, entry.currency)}
                                </p>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
