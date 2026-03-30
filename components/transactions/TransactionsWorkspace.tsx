'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, ReceiptText, Settings, Search, Plus, X, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { addIncomeAction, addExpenseAction } from '@/app/transactions/actions'

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

const EXPENSE_CATEGORIES = [
    'Yeme-İçme', 'Ulaşım', 'Market', 'Sağlık', 'Eğitim',
    'Eğlence', 'Giyim', 'Ev', 'Fatura', 'Diğer',
]

const INCOME_CATEGORIES = [
    'Maaş', 'Serbest Gelir', 'Yatırım Geliri', 'Kira Geliri',
    'İkramiye', 'Ek İş', 'Diğer',
]

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
    accounts?: Array<{ id: string; name: string }>
}

type ModalType = 'income' | 'expense' | null

export default function TransactionsWorkspace({ entries, totalIncome, totalExpense, total, accounts = [] }: Props) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [modal, setModal] = useState<ModalType>(null)
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Form state
    const [amount, setAmount] = useState('')
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const filtered = entries.filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (search && !(e.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    function resetForm() {
        setAmount('')
        setDescription('')
        setCategory('')
        setDate(new Date().toISOString().split('T')[0])
        setAccountId(accounts[0]?.id ?? '')
    }

    function handleSubmit() {
        const action = modal === 'income' ? addIncomeAction : addExpenseAction
        startTransition(async () => {
            const result = await action({
                amount: parseFloat(amount),
                accountId,
                description,
                category: category || undefined,
                date,
            })
            if (result.success) {
                setMessage({ text: result.message, type: 'success' })
                setModal(null)
                resetForm()
                setTimeout(() => setMessage(null), 3000)
            } else {
                setMessage({ text: result.message, type: 'error' })
            }
        })
    }

    const categories = modal === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

    return (
        <div>
            {/* Bildirim */}
            {message && (
                <div className={cn(
                    'mb-4 px-5 py-3 rounded-2xl text-sm font-medium border animate-in fade-in slide-in-from-top-2',
                    message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                )}>
                    {message.text}
                </div>
            )}

            {/* Özet + Aksiyonlar */}
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

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={() => { resetForm(); setModal('income') }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
                    disabled={accounts.length === 0}
                >
                    <ArrowDownLeft className="w-4 h-4" />
                    Gelir Ekle
                </button>
                <button
                    onClick={() => { resetForm(); setModal('expense') }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all"
                    disabled={accounts.length === 0}
                >
                    <ArrowUpRight className="w-4 h-4" />
                    Gider Ekle
                </button>
                {accounts.length === 0 && (
                    <Link href="/accounts" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-white/10 transition-all">
                        <Plus className="w-4 h-4" />
                        Önce hesap oluştur
                    </Link>
                )}
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
                    {entries.length === 0 ? 'Henüz işlem kaydı yok. Gelir veya gider ekleyerek başlayabilirsiniz.' : 'Bu filtreye uygun işlem bulunamadı.'}
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
                                            {entry.category && <span>• {entry.category}</span>}
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

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
                    <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                modal === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            )}>
                                {modal === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <h2 className="text-xl font-bold">
                                {modal === 'income' ? 'Gelir Kaydet' : 'Gider Kaydet'}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Tutar (TL)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-lg font-bold tabular-nums"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Hesap</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-sm"
                                >
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Açıklama</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={modal === 'income' ? 'Ör: Maaş, freelance ödeme...' : 'Ör: Market alışverişi, yakıt...'}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-sm"
                                >
                                    <option value="">Seçiniz...</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">Tarih</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white text-sm"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isPending || !amount || !description.trim() || !accountId}
                            className={cn(
                                'w-full mt-6 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2',
                                modal === 'income'
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black disabled:bg-emerald-500/30 disabled:text-emerald-300/50'
                                    : 'bg-red-500 hover:bg-red-400 text-white disabled:bg-red-500/30 disabled:text-red-300/50'
                            )}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                modal === 'income' ? 'Gelir Kaydet' : 'Gider Kaydet'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
