'use client'

import { BillingCycle, RecordStatus } from '@prisma/client'
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Calendar, Landmark, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

import { createSubscriptionDraft, deleteSubscription, updateSubscription, createRecurringExpense, deleteRecurringExpense, updateRecurringExpense } from '@/app/actions'
import BrandLogo from '@/components/BrandLogo'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import type { SubscriptionEnrichment } from '@/lib/finance-os-types'
import { formatRecordStatusLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

type SubscriptionItem = {
    id: string; name: string; amount: number; currency: string
    billingCycle: BillingCycle; nextPayment: string; monthlyNormalizedAmount: number
    category: string; logoUrl: string | null; autopay: boolean; notes: string | null
    status: RecordStatus; source: 'subscription'
}

type RecurringItem = {
    id: string; name: string; amount: number; currency: string
    billingCycle: string; nextPayment: string; category: string
    status: string; isEssential: boolean; autopay: boolean; notes: string | null
    source: 'recurring'
}

type UnifiedItem = (SubscriptionItem | RecurringItem) & { source: 'subscription' | 'recurring' }

type TabFilter = 'all' | 'subscription' | 'recurring'
type AddMode = null | 'choose' | 'subscription' | 'recurring'

const CHART_COLORS = ['#00D4AA', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

export default function ExpensesWorkspace({
    subscriptions, recurringExpenses, subscriptionLoad, recurringLoad,
}: {
    subscriptions: SubscriptionItem[]
    recurringExpenses: RecurringItem[]
    subscriptionLoad: number
    recurringLoad: number
}) {
    const [tab, setTab] = useState<TabFilter>('all')
    const [addMode, setAddMode] = useState<AddMode>(null)
    const [editItem, setEditItem] = useState<UnifiedItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDelete] = useTransition()

    const totalLoad = subscriptionLoad + recurringLoad
    const allItems: UnifiedItem[] = useMemo(() => {
        const merged = [...subscriptions, ...recurringExpenses] as UnifiedItem[]
        return merged.sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime())
    }, [subscriptions, recurringExpenses])

    const filtered = tab === 'all' ? allItems : allItems.filter((i) => i.source === tab)

    const categoryData = useMemo(() => {
        const map = new Map<string, number>()
        for (const item of allItems) {
            const cat = item.category || 'Diğer'
            map.set(cat, (map.get(cat) || 0) + item.amount)
        }
        return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }, [allItems])

    function handleDelete(item: UnifiedItem) {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
        startDelete(async () => {
            const result = item.source === 'subscription'
                ? await deleteSubscription(item.id)
                : await deleteRecurringExpense(item.id)
            setFeedback(result)
        })
    }

    function handleSuccess(result: ActionResult) {
        setAddMode(null)
        setEditItem(null)
        setFeedback(result)
    }

    const tabs: { key: TabFilter; label: string }[] = [
        { key: 'all', label: `Tümü (${allItems.length})` },
        { key: 'subscription', label: `Abonelikler (${subscriptions.length})` },
        { key: 'recurring', label: `Sabit Giderler (${recurringExpenses.length})` },
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>Finans paneli</p>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>Düzenli Ödemeler</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Abonelikler ve sabit giderleri tek merkezden yönet, kategori dağılımını analiz et.</p>
                    </div>
                    <button onClick={() => setAddMode('choose')} className="btn-primary flex items-center gap-2 cursor-pointer whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Yeni Kayıt Ekle
                    </button>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="kpi-card kpi-card-info">
                    <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Toplam Aylık Yük</p>
                    <p className="text-3xl font-bold privacy-blur tabular-nums">{formatCurrency(totalLoad, 'TRY')}</p>
                </div>
                <div className="kpi-card kpi-card-purple">
                    <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Abonelik Yükü</p>
                    <p className="text-2xl font-bold privacy-blur tabular-nums">{formatCurrency(subscriptionLoad, 'TRY')}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subscriptions.length} aktif abonelik</p>
                </div>
                <div className="kpi-card kpi-card-warning">
                    <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Sabit Gider Yükü</p>
                    <p className="text-2xl font-bold privacy-blur tabular-nums">{formatCurrency(recurringLoad, 'TRY')}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{recurringExpenses.length} aktif gider</p>
                </div>
            </div>

            {/* Chart + List Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8">
                {/* Pie Chart */}
                <div className="fintech-card p-6 h-fit xl:sticky xl:top-10">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--text-muted)' }}>Kategori Dağılımı</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                                        {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value?: number) => formatCurrency(value ?? 0, 'TRY')}
                                        contentStyle={{
                                            background: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '0.75rem',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.75rem',
                                            boxShadow: 'var(--shadow-elevated)',
                                        }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        labelStyle={{ color: 'var(--text-muted)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-4">
                                {categoryData.slice(0, 6).map((cat, i) => (
                                    <div key={cat.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                                        </div>
                                        <span className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cat.value, 'TRY')}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>Henüz veri yok</p>
                    )}
                </div>

                {/* List */}
                <div className="space-y-4">
                    <FormMessage success={feedback?.success} message={feedback?.message} />

                    {/* Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                                style={{
                                    background: tab === t.key ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                                    color: tab === t.key ? '#000' : 'var(--text-secondary)',
                                    border: `1px solid ${tab === t.key ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="fintech-card p-16 text-center" style={{ color: 'var(--text-muted)' }}>
                            Bu kategoride kayıt bulunmuyor.
                        </div>
                    ) : (
                        filtered.map((item) => (
                            <div key={item.id} className="fintech-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    {item.source === 'subscription' ? (
                                        <BrandLogo name={item.name} src={(item as SubscriptionItem).logoUrl} size={44} />
                                    ) : (
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)' }}>
                                            <Landmark className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
                                            <span className={`status-badge ${item.source === 'subscription' ? 'status-badge-info' : 'status-badge-warning'}`}>
                                                {item.source === 'subscription' ? 'Abonelik' : 'Sabit Gider'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(item.nextPayment).toLocaleDateString('tr-TR')}
                                            </span>
                                            <span>{item.category}</span>
                                            <span>{formatRecordStatusLabel(item.status)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-bold privacy-blur tabular-nums" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(item.amount, item.currency)}
                                    </p>
                                    <button onClick={() => setEditItem(item)} className="p-2 rounded-xl cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item)} className="p-2 rounded-xl cursor-pointer transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Modal — Step 1: Choose Type */}
            {addMode === 'choose' ? (
                <Modal title="Yeni Kayıt Ekle" subtitle="Eklemek istediğin türü seç" onClose={() => setAddMode(null)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => setAddMode('subscription')}
                            className="fintech-card p-6 text-left cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ border: '1px solid var(--border-default)' }}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Abonelik</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Netflix, Spotify, ChatGPT gibi dijital servisler. AI ile marka tahmini yapılır.</p>
                        </button>
                        <button
                            onClick={() => setAddMode('recurring')}
                            className="fintech-card p-6 text-left cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ border: '1px solid var(--border-default)' }}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-warning-bg)', color: 'var(--accent-warning)' }}>
                                <Landmark className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Sabit Gider</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kira, aidat, sigorta, internet faturası gibi düzenli ödemeler.</p>
                        </button>
                    </div>
                </Modal>
            ) : null}

            {/* Add Subscription Modal */}
            {addMode === 'subscription' ? (
                <Modal title="Abonelik Ekle" subtitle="AI ile marka tahmini yapılır" onClose={() => setAddMode(null)}>
                    <SubscriptionAddForm onSuccess={handleSuccess} />
                </Modal>
            ) : null}

            {/* Add Recurring Modal */}
            {addMode === 'recurring' ? (
                <Modal title="Sabit Gider Ekle" onClose={() => setAddMode(null)}>
                    <RecurringAddForm onSuccess={handleSuccess} />
                </Modal>
            ) : null}

            {/* Edit Modal */}
            {editItem ? (
                <Modal title={editItem.source === 'subscription' ? 'Aboneliği Düzenle' : 'Sabit Gideri Düzenle'} onClose={() => setEditItem(null)}>
                    {editItem.source === 'subscription' ? (
                        <SubscriptionEditForm item={editItem as SubscriptionItem} onSuccess={handleSuccess} />
                    ) : (
                        <RecurringEditForm item={editItem as RecurringItem} onSuccess={handleSuccess} />
                    )}
                </Modal>
            ) : null}
        </div>
    )
}

/* ============================================================
   SUB-FORMS
   ============================================================ */

function SubscriptionAddForm({ onSuccess }: { onSuccess: (r: ActionResult) => void }) {
    const formRef = useRef<HTMLFormElement>(null)
    const [name, setName] = useState('')
    const [preview, setPreview] = useState<SubscriptionEnrichment | null>(null)
    const [createState, createAction] = useActionState(createSubscriptionDraft, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (name.trim().length < 2) return
        const controller = new AbortController()
        const tid = window.setTimeout(async () => {
            const res = await fetch('/api/subscription-enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), signal: controller.signal })
            if (res.ok) setPreview(await res.json())
        }, 300)
        return () => { controller.abort(); window.clearTimeout(tid) }
    }, [name])

    useEffect(() => {
        if (!createState.success) return
        const tid = window.setTimeout(() => onSuccess(createState), 0)
        return () => window.clearTimeout(tid)
    }, [createState, onSuccess])

    const activePreview = name.trim().length < 2 ? null : preview

    return (
        <form ref={formRef} action={createAction} className="space-y-4">
            <div>
                <label className="form-label">Abonelik adı</label>
                <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix, Spotify, ChatGPT..." className="form-input" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tutar</label><input name="amount" type="number" step="0.01" placeholder="149.99" className="form-input" required /></div>
                <div><label className="form-label">Döviz</label>
                    <select name="currency" defaultValue="TRY" className="form-input form-select"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Kategori</label><input name="category" defaultValue={activePreview?.category ?? 'Genel'} className="form-input" /></div>
                <div><label className="form-label">Döngü</label>
                    <select name="billingCycle" defaultValue={activePreview?.billingCycle ?? 'MONTHLY'} className="form-input form-select"><option value="MONTHLY">Aylık</option><option value="YEARLY">Yıllık</option></select>
                </div>
            </div>
            <div><label className="form-label">Sonraki ödeme</label><input name="nextPayment" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="form-input" required /></div>
            {activePreview ? (
                <div className="fintech-card p-3 flex items-center gap-3">
                    <BrandLogo name={activePreview.displayName} src={activePreview.logoUrl} color={activePreview.color} size={40} />
                    <div className="min-w-0">
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Sparkles className="w-3 h-3" /> AI Zenginleştirme</p>
                        <p className="font-semibold text-sm truncate">{activePreview.displayName}</p>
                    </div>
                </div>
            ) : null}
            <FormMessage success={createState.success} message={createState.message} />
            <SubmitButton label="Aboneliği Kaydet" pendingLabel="Kaydediliyor..." />
        </form>
    )
}

function RecurringAddForm({ onSuccess }: { onSuccess: (r: ActionResult) => void }) {
    const [createState, createAction] = useActionState(createRecurringExpense, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!createState.success) return
        const tid = window.setTimeout(() => onSuccess(createState), 0)
        return () => window.clearTimeout(tid)
    }, [createState, onSuccess])

    return (
        <form action={createAction} className="space-y-4">
            <div><label className="form-label">Gider adı</label><input name="name" placeholder="Kira, Aidat, Sigorta..." className="form-input" required /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tutar</label><input name="amount" type="number" step="0.01" placeholder="0.00" className="form-input" required /></div>
                <div><label className="form-label">Döviz</label><select name="currency" defaultValue="TRY" className="form-input form-select"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Kategori</label><input name="category" placeholder="Barınma, fatura..." className="form-input" required /></div>
                <div><label className="form-label">Döngü</label><select name="billingCycle" defaultValue="MONTHLY" className="form-input form-select"><option value="MONTHLY">Aylık</option><option value="YEARLY">Yıllık</option></select></div>
            </div>
            <div><label className="form-label">Sonraki ödeme</label><input name="nextPayment" type="date" className="form-input" required /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input name="isEssential" type="checkbox" defaultChecked className="rounded" /> Kritik gider
            </label>
            <FormMessage success={createState.success} message={createState.message} />
            <SubmitButton label="Gideri Kaydet" pendingLabel="Kaydediliyor..." />
        </form>
    )
}

function SubscriptionEditForm({ item, onSuccess }: { item: SubscriptionItem; onSuccess: (r: ActionResult) => void }) {
    const [state, action] = useActionState(updateSubscription, EMPTY_ACTION_RESULT)
    useEffect(() => { if (state.success) { const t = window.setTimeout(() => onSuccess(state), 0); return () => window.clearTimeout(t) } }, [state, onSuccess])

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="subscriptionId" value={item.id} />
            <div><label className="form-label">Ad</label><input name="name" defaultValue={item.name} className="form-input" required /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tutar</label><input name="amount" type="number" step="0.01" defaultValue={item.amount} className="form-input" required /></div>
                <div><label className="form-label">Döviz</label><select name="currency" defaultValue={item.currency} className="form-input form-select"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Kategori</label><input name="category" defaultValue={item.category} className="form-input" /></div>
                <div><label className="form-label">Döngü</label><select name="billingCycle" defaultValue={item.billingCycle} className="form-input form-select"><option value="MONTHLY">Aylık</option><option value="YEARLY">Yıllık</option></select></div>
            </div>
            <div><label className="form-label">Sonraki ödeme</label><input name="nextPayment" type="date" defaultValue={item.nextPayment.slice(0, 10)} className="form-input" required /></div>
            <select name="status" defaultValue={item.status} className="form-input form-select"><option value="ACTIVE">Aktif</option><option value="PAUSED">Duraklatıldı</option><option value="CANCELED">İptal Edildi</option></select>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label="Güncelle" pendingLabel="Güncelleniyor..." />
        </form>
    )
}

function RecurringEditForm({ item, onSuccess }: { item: RecurringItem; onSuccess: (r: ActionResult) => void }) {
    const [state, action] = useActionState(updateRecurringExpense, EMPTY_ACTION_RESULT)
    useEffect(() => { if (state.success) { const t = window.setTimeout(() => onSuccess(state), 0); return () => window.clearTimeout(t) } }, [state, onSuccess])

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="expenseId" value={item.id} />
            <div><label className="form-label">Ad</label><input name="name" defaultValue={item.name} className="form-input" required /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Tutar</label><input name="amount" type="number" step="0.01" defaultValue={item.amount} className="form-input" required /></div>
                <div><label className="form-label">Döviz</label><select name="currency" defaultValue={item.currency} className="form-input form-select"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="form-label">Kategori</label><input name="category" defaultValue={item.category} className="form-input" required /></div>
                <div><label className="form-label">Döngü</label><select name="billingCycle" defaultValue={item.billingCycle} className="form-input form-select"><option value="MONTHLY">Aylık</option><option value="YEARLY">Yıllık</option></select></div>
            </div>
            <div><label className="form-label">Sonraki ödeme</label><input name="nextPayment" type="date" defaultValue={item.nextPayment.slice(0, 10)} className="form-input" required /></div>
            <select name="status" defaultValue={item.status} className="form-input form-select"><option value="ACTIVE">Aktif</option><option value="PAUSED">Duraklatıldı</option><option value="CANCELED">İptal Edildi</option></select>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label="Güncelle" pendingLabel="Güncelleniyor..." />
        </form>
    )
}
