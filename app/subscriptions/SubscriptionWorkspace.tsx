'use client'

import { BillingCycle, RecordStatus } from '@prisma/client'
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Calendar, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'

import { createSubscriptionDraft, deleteSubscription, updateSubscription } from '@/app/actions'
import BrandLogo from '@/components/BrandLogo'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import type { SubscriptionEnrichment } from '@/lib/finance-os-types'
import { formatRecordStatusLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

type SubscriptionItem = {
    id: string
    name: string
    amount: number
    currency: string
    billingCycle: BillingCycle
    nextPayment: string
    monthlyNormalizedAmount: number
    category: string
    logoUrl: string | null
    autopay: boolean
    notes: string | null
    status: RecordStatus
}

type SubscriptionWorkspaceProps = {
    subscriptions: SubscriptionItem[]
}

function toDateInputValue(date: Date) {
    return date.toISOString().slice(0, 10)
}

export default function SubscriptionWorkspace({ subscriptions }: SubscriptionWorkspaceProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [name, setName] = useState('')
    const [amount, setAmount] = useState('')
    const [currency, setCurrency] = useState('TRY')
    const [category, setCategory] = useState('Genel')
    const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.MONTHLY)
    const [nextPayment, setNextPayment] = useState(toDateInputValue(new Date()))
    const [preview, setPreview] = useState<SubscriptionEnrichment | null>(null)
    const [createState, createAction] = useActionState(createSubscriptionDraft, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateSubscription, EMPTY_ACTION_RESULT)
    const activePreview = name.trim().length < 2 ? null : preview

    async function fetchSubscriptionEnrichment(rawName: string) {
        const response = await fetch('/api/subscription-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: rawName }),
        })

        if (!response.ok) {
            return null
        }

        return (await response.json()) as SubscriptionEnrichment
    }

    useEffect(() => {
        if (name.trim().length < 2) {
            return
        }

        const controller = new AbortController()
        const timeoutId = window.setTimeout(async () => {
            const response = await fetch('/api/subscription-enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
                signal: controller.signal,
            })

            if (!response.ok) {
                return
            }

            const result = (await response.json()) as SubscriptionEnrichment
            setPreview(result)
            setCategory(result.category)
            setBillingCycle(result.billingCycle)

            if (result.shouldCanonicalizeName && result.displayName !== name.trim()) {
                setName(result.displayName)
            }
        }, 250)

        return () => {
            controller.abort()
            window.clearTimeout(timeoutId)
        }
    }, [name])

    useEffect(() => {
        if (!createState.success) return

        const timeoutId = window.setTimeout(() => {
            formRef.current?.reset()
            setName('')
            setAmount('')
            setCurrency('TRY')
            setCategory('Genel')
            setBillingCycle(BillingCycle.MONTHLY)
            setNextPayment(toDateInputValue(new Date()))
            setPreview(null)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState])

    useEffect(() => {
        if (!updateState.success || !editingSubscription) return

        const timeoutId = window.setTimeout(() => {
            setEditingSubscription(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingSubscription])

    const monthlyTotal = useMemo(
        () => subscriptions.reduce((sum, subscription) => sum + subscription.monthlyNormalizedAmount, 0),
        [subscriptions],
    )

    function handleDelete(subscriptionId: string) {
        if (!confirm('Bu abonelik kaydini silmek istediginize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteSubscription(subscriptionId)
            setFeedback(result)
        })
    }

    async function handleEditNameBlur(event: React.FocusEvent<HTMLInputElement>) {
        const rawName = event.currentTarget.value.trim()
        if (rawName.length < 2) {
            return
        }

        const enrichment = await fetchSubscriptionEnrichment(rawName)
        if (enrichment?.shouldCanonicalizeName) {
            event.currentTarget.value = enrichment.displayName
        }
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-8">
            <div className="fintech-card p-6 md:p-7 xl:sticky xl:top-10 h-fit bg-gradient-to-b from-zinc-950 to-black">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Hızlı ekle</p>
                        <h2 className="text-2xl font-bold">Abonelik komut merkezi</h2>
                    </div>
                    <div className="rounded-2xl bg-white text-black w-12 h-12 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                    </div>
                </div>

                <form ref={formRef} action={createAction} className="space-y-4">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1.5 block px-1">Abonelik adı</label>
                        <input
                            name="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Netflix, Spotify, ChatGPT..."
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1.5 block px-1">Tutar</label>
                            <input
                                name="amount"
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                placeholder="149.99"
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1.5 block px-1">Döviz</label>
                            <select
                                name="currency"
                                value={currency}
                                onChange={(event) => setCurrency(event.target.value)}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                            >
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1.5 block px-1">Kategori</label>
                            <input
                                name="category"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1.5 block px-1">Ödeme döngüsü</label>
                            <select
                                name="billingCycle"
                                value={billingCycle}
                                onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                            >
                                <option value={BillingCycle.MONTHLY}>Aylık</option>
                                <option value={BillingCycle.YEARLY}>Yıllık</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1.5 block px-1">Sonraki ödeme</label>
                            <input
                                name="nextPayment"
                                type="date"
                                value={nextPayment}
                                onChange={(event) => setNextPayment(event.target.value)}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                required
                            />
                        </div>
                        <label className="flex items-end gap-3 text-sm text-zinc-300 pb-3">
                            <input name="autopay" type="checkbox" className="rounded border-white/20 bg-black" />
                            Otomatik
                        </label>
                    </div>

                    <textarea
                        name="notes"
                        placeholder="Notlar, paket bilgisi, kart bilgisi..."
                        className="w-full min-h-24 bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                    />

                    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 flex items-center gap-4">
                        <BrandLogo
                            name={activePreview?.displayName ?? (name || 'OS')}
                            src={activePreview?.logoUrl}
                            color={activePreview?.color}
                            size={56}
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-500 mb-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                Akıllı zenginleştirme
                            </div>
                            <p className="font-semibold truncate">{activePreview?.displayName ?? 'Marka tahmini bekleniyor'}</p>
                            <p className="text-sm text-zinc-400 truncate">
                                {activePreview?.providerDomain ?? 'Domain bilinmiyor'} • {activePreview?.category ?? 'Genel'}
                            </p>
                        </div>
                    </div>

                    <FormMessage success={createState.success} message={createState.message} />
                    <SubmitButton label="Aboneliği Kaydet" pendingLabel="Kaydediliyor..." />
                </form>
            </div>

            <div className="space-y-4">
                <FormMessage success={feedback?.success} message={feedback?.message} />

                <div className="fintech-card p-6 md:p-7 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam yük</p>
                            <h3 className="text-3xl font-bold privacy-blur">{formatCurrency(monthlyTotal, 'TRY')}</h3>
                            <p className="text-zinc-400 mt-2">Aylık normalize abonelik yükü</p>
                        </div>
                        <div className="text-sm text-zinc-400">
                            {subscriptions.length} aktif kayıt
                        </div>
                    </div>
                </div>

                {subscriptions.length === 0 ? (
                    <div className="fintech-card p-16 text-center">
                        <p className="text-zinc-400">Henüz abonelik eklenmedi. Hızlı ekle ile ilk servisi ekleyebilirsin.</p>
                    </div>
                ) : (
                    subscriptions.map((subscription) => (
                        <div
                            key={subscription.id}
                            className="fintech-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/5 hover:border-white/15 transition-all"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <BrandLogo name={subscription.name} src={subscription.logoUrl} size={54} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-lg font-semibold truncate">{subscription.name}</h3>
                                        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                                            {formatRecordStatusLabel(subscription.status)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mt-1">
                                        <span className="flex items-center gap-1 privacy-blur">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(subscription.nextPayment).toLocaleDateString('tr-TR')}
                                        </span>
                                        <span>{subscription.category}</span>
                                        <span>{subscription.billingCycle === BillingCycle.YEARLY ? 'Yıllık' : 'Aylık'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4">
                                <div className="text-right">
                                    <p className="text-xl font-bold privacy-blur">{formatCurrency(subscription.amount, subscription.currency)}</p>
                                    <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] privacy-blur">
                                        Aylık etki {formatCurrency(subscription.monthlyNormalizedAmount, 'TRY')}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setEditingSubscription(subscription)}
                                    className="p-3 text-zinc-600 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(subscription.id)}
                                    className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    aria-label={`${subscription.name} kaydını sil`}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {editingSubscription ? (
                <Modal title="Aboneliği Düzenle" onClose={() => setEditingSubscription(null)}>
                    <form action={updateAction} className="space-y-4">
                        <input type="hidden" name="subscriptionId" value={editingSubscription.id} />
                        <input
                            name="name"
                            defaultValue={editingSubscription.name}
                            onBlur={handleEditNameBlur}
                            placeholder="Abonelik adı"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4"
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="amount" type="number" step="0.01" defaultValue={editingSubscription.amount} placeholder="Tutar" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                            <select name="currency" defaultValue={editingSubscription.currency} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input name="category" defaultValue={editingSubscription.category} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                            <select name="billingCycle" defaultValue={editingSubscription.billingCycle} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                <option value={BillingCycle.MONTHLY}>Aylık</option>
                                <option value={BillingCycle.YEARLY}>Yıllık</option>
                            </select>
                        </div>
                        <input name="nextPayment" type="date" defaultValue={editingSubscription.nextPayment.slice(0, 10)} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                        <select name="status" defaultValue={editingSubscription.status} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                            <option value={RecordStatus.ACTIVE}>Aktif</option>
                            <option value={RecordStatus.PAUSED}>Duraklatıldı</option>
                            <option value={RecordStatus.CANCELED}>İptal Edildi</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-zinc-300">
                            <input
                                name="autopay"
                                type="checkbox"
                                defaultChecked={editingSubscription.autopay}
                                className="rounded border-white/20 bg-black"
                            />
                            Otomatik ödeme
                        </label>
                        <textarea
                            name="notes"
                            defaultValue={editingSubscription.notes ?? ''}
                            placeholder="Notlar"
                            className="w-full min-h-24 bg-black border border-white/10 rounded-2xl py-3 px-4"
                        />
                        <FormMessage success={updateState.success} message={updateState.message} />
                        <SubmitButton label="Aboneliği Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </Modal>
            ) : null}
        </div>
    )
}
