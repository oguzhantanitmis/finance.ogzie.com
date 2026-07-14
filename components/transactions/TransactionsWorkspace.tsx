'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, ReceiptText, Settings, Search, Plus, X, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { addIncomeAction, addExpenseAction } from '@/app/transactions/actions'

const TYPE_META: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
    INCOME: { label: 'Gelir', icon: ArrowDownLeft, color: 'text-[color:var(--accent-success)]' },
    EXPENSE: { label: 'Gider', icon: ArrowUpRight, color: 'text-[color:var(--accent-danger)]' },
    COLLECTION: { label: 'Tahsilat', icon: ArrowDownLeft, color: 'text-[color:var(--accent-success)]' },
    PAYMENT_TO_PERSON: { label: 'Kişiye Ödeme', icon: ArrowUpRight, color: 'text-[color:var(--accent-danger)]' },
    CARD_PAYMENT: { label: 'Kart Ödeme', icon: CreditCard, color: 'text-[color:var(--accent-danger)]' },
    SUBSCRIPTION_PAYMENT: { label: 'Abonelik', icon: ReceiptText, color: 'text-[color:var(--accent-danger)]' },
    DEBT_PAYMENT: { label: 'Borç Ödeme', icon: ArrowUpRight, color: 'text-[color:var(--accent-danger)]' },
    DEBT_ADDITION: { label: 'Borç Ekleme', icon: ArrowUpRight, color: 'text-[color:var(--accent-warning)]' },
    RECEIVABLE_ADDITION: { label: 'Alacak Ekleme', icon: ArrowDownLeft, color: 'text-[color:var(--accent-info)]' },
    TRANSFER: { label: 'Transfer', icon: ArrowLeftRight, color: 'text-[color:var(--accent-info)]' },
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
    isForecast: boolean
}

interface Props {
    entries: EntryData[]
    totalIncome: number
    totalExpense: number
    total: number
    accounts?: Array<{ id: string; name: string }>
    /** ogzie öngörü satırları listede gösterilsin mi (URL ?forecast=1). */
    showForecast?: boolean
}

type ModalType = 'income' | 'expense' | null

export default function TransactionsWorkspace({ entries, totalIncome, totalExpense, total, accounts = [], showForecast = false }: Props) {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [modal, setModal] = useState<ModalType>(null)
    const [isPending, startTransition] = useTransition()
    const [isForecastPending, startForecastTransition] = useTransition()
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Form state
    const [amount, setAmount] = useState('')
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
    const [isCash, setIsCash] = useState(false)
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const filtered = entries.filter((e) => {
        if (typeFilter !== 'all' && e.type !== typeFilter) return false
        if (search && !(e.description ?? '').toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const today = new Date().toISOString().split('T')[0]

    const resetForm = useCallback(() => {
        setAmount('')
        setDescription('')
        setCategory('')
        setDate(new Date().toISOString().split('T')[0])
        setAccountId(accounts[0]?.id ?? '')
        setIsCash(false)
    }, [accounts])

    const hasDirtyForm = Boolean(amount || description || category || date !== today || isCash)

    // Hızlı işlem derin bağlantısı: /transactions?new=income|expense → modalı aç
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    useEffect(() => {
        const n = searchParams.get('new')
        if (n !== 'income' && n !== 'expense') return
        const timeoutId = window.setTimeout(() => {
            resetForm()
            setModal(n)
        }, 0)
        router.replace(pathname, { scroll: false })
        return () => window.clearTimeout(timeoutId)
    }, [searchParams, resetForm, router, pathname])

    // Öngörüleri göster toggle'ı: durum URL ?forecast=1 ile (server-render uyumlu).
    const toggleForecast = useCallback((checked: boolean) => {
        const next = new URLSearchParams(searchParams.toString())
        if (checked) next.set('forecast', '1')
        else next.delete('forecast')
        const qs = next.toString()
        startForecastTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        })
    }, [searchParams, router, pathname])

    const requestCloseModal = useCallback(() => {
        if (hasDirtyForm && !confirm('Formda girilmiş bilgi var. Kapatmak istiyor musunuz?')) return
        setModal(null)
        resetForm()
    }, [hasDirtyForm, resetForm])

    function handleSubmit() {
        const action = modal === 'income' ? addIncomeAction : addExpenseAction
        startTransition(async () => {
            const result = await action({
                amount: parseFloat(amount),
                accountId,
                isCash,
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

    // ESC ile açık gelir/gider penceresini kapat.
    useEffect(() => {
        if (!modal) return
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                requestCloseModal()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [modal, requestCloseModal])

    return (
        <div>
            {/* Bildirim */}
            {message && (
                <div className={cn(
                    'mb-4 px-5 py-3 rounded-2xl text-sm font-medium border animate-in fade-in slide-in-from-top-2',
                    message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-[color:var(--accent-success)]'
                        : 'bg-red-500/10 border-red-500/20 text-[color:var(--accent-danger)]'
                )}>
                    {message.text}
                </div>
            )}

            {/* Özet + Aksiyonlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5 min-w-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Giriş</p>
                    <p className="text-xl sm:text-2xl font-bold leading-tight break-all text-[color:var(--accent-success)] privacy-blur">{formatCurrency(totalIncome, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5 min-w-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Çıkış</p>
                    <p className="text-xl sm:text-2xl font-bold leading-tight break-all text-[color:var(--accent-danger)] privacy-blur">{formatCurrency(totalExpense, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5 min-w-0">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Kayıt</p>
                    <p className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{total}</p>
                </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={() => { resetForm(); setModal('income') }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[color:var(--accent-success)] text-sm font-medium hover:bg-emerald-500/20 transition-all"
                >
                    <ArrowDownLeft className="w-4 h-4" />
                    Gelir Ekle
                </button>
                <button
                    onClick={() => { resetForm(); setModal('expense') }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-[color:var(--accent-danger)] text-sm font-medium hover:bg-red-500/20 transition-all"
                >
                    <ArrowUpRight className="w-4 h-4" />
                    Gider Ekle
                </button>
                {accounts.length === 0 && (
                    <Link href="/accounts" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[var(--bg-hover)] border border-[var(--border-default)] text-zinc-400 text-sm font-medium hover:bg-[var(--bg-elevated)] transition-all">
                        <Plus className="w-4 h-4" />
                        Banka hesabı için hesap oluştur
                    </Link>
                )}
            </div>

            {/* Filtreler */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="İşlem ara..."
                        className="w-full border rounded-2xl py-3 pl-11 pr-4 text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border rounded-2xl py-3 px-4 text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                >
                    <option value="all">Tüm Tipler</option>
                    {Object.entries(TYPE_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                    ))}
                </select>
                <label
                    className="inline-flex items-center gap-2 border rounded-2xl py-3 px-4 text-sm cursor-pointer select-none"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                    title="ogzie öngörü (tahmin) satırlarını listede göster. Toplamlar her zaman gerçekleşen kayıtları gösterir."
                >
                    <input
                        type="checkbox"
                        checked={showForecast}
                        disabled={isForecastPending}
                        onChange={(e) => toggleForecast(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                    />
                    <span>Öngörüleri göster</span>
                    {isForecastPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                </label>
            </div>

            {/* İşlem Listesi */}
            {filtered.length === 0 ? (
                <div className="fintech-card p-16 text-center" style={{ color: 'var(--text-secondary)' }}>
                    {entries.length === 0 ? 'Henüz işlem kaydı yok. Gelir veya gider ekleyerek başlayabilirsiniz.' : 'Bu filtreye uygun işlem bulunamadı.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((entry) => {
                        const meta = TYPE_META[entry.type] ?? TYPE_META.BALANCE_ADJUSTMENT
                        const Icon = meta.icon
                        const isPositive = entry.amount > 0
                        return (
                            <div key={entry.id} className="fintech-card p-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={cn('w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-[var(--bg-hover)]', meta.color)}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.description || meta.label}</p>
                                            {entry.isForecast && (
                                                <span
                                                    className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide"
                                                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                                                >
                                                    Öngörü
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span>{meta.label}</span>
                                            {entry.category && <span>• {entry.category}</span>}
                                            {entry.account && <span>• {entry.account.name}</span>}
                                            <span className="privacy-blur">• {new Date(entry.date).toLocaleDateString('tr-TR')}</span>
                                        </div>
                                        {entry.sourceHref && entry.sourceLabel ? (
                                            <Link
                                                href={entry.sourceHref}
                                                className="inline-flex items-center gap-2 text-xs mt-2 transition-colors" style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {entry.sourceLabel} →
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                                <p className={cn('font-bold tabular-nums privacy-blur shrink-0 text-right text-sm sm:text-base max-w-[45%] break-all leading-tight', isPositive ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
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
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={requestCloseModal} />
                    <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={requestCloseModal} className="absolute top-4 right-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                modal === 'income' ? 'bg-emerald-500/10 text-[color:var(--accent-success)]' : 'bg-red-500/10 text-[color:var(--accent-danger)]'
                            )}>
                                {modal === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {modal === 'income' ? 'Gelir Kaydet' : 'Gider Kaydet'}
                            </h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Tutar (TL)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full border rounded-2xl py-3 px-4 text-lg font-bold tabular-nums" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                    autoFocus
                                />
                            </div>

                            <label
                                className="flex items-center justify-between gap-4 rounded-2xl p-4 cursor-pointer"
                                style={{ border: '1px solid var(--border-default)', background: isCash ? 'var(--accent-success-bg)' : 'var(--bg-hover)' }}
                            >
                                <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nakit işlem</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Seçilirse işlem doğrudan Nakit hesabına işlenir.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isCash}
                                    onChange={(event) => {
                                        const checked = event.target.checked
                                        setIsCash(checked)
                                        setAccountId(checked ? '' : accounts[0]?.id ?? '')
                                    }}
                                    className="h-5 w-5 rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                                />
                            </label>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Hesap</label>
                                <select
                                    value={accountId}
                                    onChange={(e) => setAccountId(e.target.value)}
                                    disabled={isCash}
                                    className={cn(
                                        'w-full border border-[var(--border-default)] rounded-2xl py-3 px-4 text-sm',
                                        isCash ? 'opacity-60 cursor-not-allowed' : '',
                                    )}
                                    style={{ background: isCash ? 'var(--bg-hover)' : 'var(--bg-input)', color: 'var(--text-primary)' }}
                                >
                                    {isCash ? <option value="">Nakit hesap kullanılacak</option> : null}
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                {isCash ? (
                                    <p className="text-xs mt-2" style={{ color: 'var(--accent-success)' }}>Nakit hesap kullanılacak. Hesap seçimi devre dışı.</p>
                                ) : null}
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Açıklama</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={modal === 'income' ? 'Ör: Maaş, freelance ödeme...' : 'Ör: Market alışverişi, yakıt...'}
                                    className="w-full border rounded-2xl py-3 px-4 text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full border rounded-2xl py-3 px-4 text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Seçiniz...</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Tarih</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border rounded-2xl py-3 px-4 text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isPending || !amount || !description.trim() || (!isCash && !accountId)}
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
