'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { PiggyBank, Trash2, WalletCards, Pencil } from 'lucide-react'

import {
    createIncomeSource,
    deleteIncomeSource,
    dismissBudgetAlert,
    updateBudgetMonth,
    updateIncomeSource,
} from '@/app/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { formatAlertTypeLabel, formatBillingCycleLabel, formatRecordStatusLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

type IncomeSourceItem = {
    id: string
    name: string
    amount: number
    currency: string
    billingCycle: string
    payday: number | null
    status: string
    isPrimary: boolean
}

type AlertItem = {
    id: string
    type: string
    title: string
    content: string
}

export default function BudgetWorkspace({
    summary,
}: {
    summary: {
        plannedIncome: number
        fixedCommitments: number
        debtCommitments: number
        freeCash: number
        month: string
        bufferTarget: number
        notes: string | null
        alerts: AlertItem[]
        incomeSources: IncomeSourceItem[]
    }
}) {
    const [showIncomeModal, setShowIncomeModal] = useState(false)
    const [editingIncome, setEditingIncome] = useState<IncomeSourceItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startTransition] = useTransition()
    const [monthState, monthAction] = useActionState(updateBudgetMonth, EMPTY_ACTION_RESULT)
    const [createIncomeState, createIncomeAction] = useActionState(createIncomeSource, EMPTY_ACTION_RESULT)
    const [updateIncomeState, updateIncomeAction] = useActionState(updateIncomeSource, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!createIncomeState.success || !showIncomeModal) return

        const timeoutId = window.setTimeout(() => {
            setShowIncomeModal(false)
            setFeedback(createIncomeState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createIncomeState, showIncomeModal])

    useEffect(() => {
        if (!updateIncomeState.success || !editingIncome) return

        const timeoutId = window.setTimeout(() => {
            setEditingIncome(null)
            setFeedback(updateIncomeState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateIncomeState, editingIncome])

    useEffect(() => {
        if (!monthState.success) return

        const timeoutId = window.setTimeout(() => {
            setFeedback(monthState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [monthState])

    function handleDeleteIncome(incomeId: string) {
        if (!confirm('Bu gelir kaydini silmek istediginize emin misiniz?')) return
        startTransition(async () => {
            const result = await deleteIncomeSource(incomeId)
            setFeedback(result)
        })
    }

    function handleDismissAlert(alertId: string) {
        startTransition(async () => {
            const result = await dismissBudgetAlert(alertId)
            setFeedback(result)
        })
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-8">
            <div className="space-y-6">
                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Gelir kaynakları</p>
                            <h2 className="text-2xl font-bold">Düzenli gelir ekle</h2>
                        </div>
                        <PiggyBank className="w-5 h-5 text-zinc-500" />
                    </div>
                    <button onClick={() => setShowIncomeModal(true)} className="w-full bg-white text-black font-bold py-4 rounded-2xl">
                        Yeni Gelir Kaynağı Ekle
                    </button>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Ay ayarları</p>
                            <h2 className="text-2xl font-bold">Ay Ayarı</h2>
                        </div>
                        <WalletCards className="w-5 h-5 text-zinc-500" />
                    </div>
                    <form action={monthAction} className="space-y-4">
                        <input type="hidden" name="month" value={summary.month} />
                        <input name="plannedIncome" type="number" step="0.01" defaultValue={summary.plannedIncome} placeholder="Planlanan gelir" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <input name="fixedCommitments" type="number" step="0.01" defaultValue={summary.fixedCommitments} placeholder="Sabit giderler" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <input name="debtCommitments" type="number" step="0.01" defaultValue={summary.debtCommitments} placeholder="Borç ödemeleri" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <input name="freeCash" type="number" step="0.01" defaultValue={summary.freeCash} placeholder="Serbest nakit" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <input name="bufferTarget" type="number" step="0.01" defaultValue={summary.bufferTarget} placeholder="Hedef tampon" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <textarea name="notes" defaultValue={summary.notes ?? ''} placeholder="Ay notları ve manuel ayarlar" className="w-full min-h-24 bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
                        <FormMessage success={monthState.success} message={monthState.message} />
                        <SubmitButton label="Bütçeyi Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </div>
            </div>

            <div className="space-y-6">
                <FormMessage success={feedback?.success} message={feedback?.message} />

                <div className="fintech-card p-6 md:p-7">
                    <h2 className="text-2xl font-bold mb-5">Uyarılar</h2>
                    {summary.alerts.length === 0 ? (
                        <p className="text-zinc-400">Açık uyarın yok. Plan temiz.</p>
                    ) : (
                        <div className="space-y-3">
                            {summary.alerts.map((alert) => (
                                <div key={alert.id} className="rounded-3xl border border-white/8 bg-[var(--bg-hover)] p-4 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{formatAlertTypeLabel(alert.type)}</p>
                                        <h3 className="font-semibold mb-1">{alert.title}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{alert.content}</p>
                                    </div>
                                    <button onClick={() => handleDismissAlert(alert.id)} className="text-xs text-zinc-500 hover:text-white">
                                        Kapat
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="fintech-card p-6 md:p-7">
                    <h2 className="text-2xl font-bold mb-5">Gelir kaynakları</h2>
                    {summary.incomeSources.length === 0 ? (
                        <p className="text-zinc-400">Gelir kaydı yok. Gelir girmezsen serbest nakit hesapları eksik kalır.</p>
                    ) : (
                        <div className="space-y-3">
                            {summary.incomeSources.map((income) => (
                                <div key={income.id} className="rounded-3xl border border-white/8 bg-[var(--bg-hover)] p-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="font-semibold">{income.name}</p>
                                        <p className="text-sm text-zinc-500">
                                            {formatBillingCycleLabel(income.billingCycle)}
                                            {income.payday ? ` • Gün ${income.payday}` : ''}
                                            {income.isPrimary ? ' • Ana gelir' : ''}
                                            {income.status !== 'ACTIVE' ? ` • ${formatRecordStatusLabel(income.status)}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold privacy-blur">{formatCurrency(income.amount, income.currency)}</p>
                                        <button onClick={() => setEditingIncome(income)} className="p-2 text-zinc-600 hover:text-white">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteIncome(income.id)} className="p-2 text-zinc-600 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showIncomeModal ? (
                <Modal title="Gelir Kaynağı Ekle" onClose={() => setShowIncomeModal(false)}>
                    <IncomeSourceForm action={createIncomeAction} income={null} state={createIncomeState} />
                </Modal>
            ) : null}

            {editingIncome ? (
                <Modal title="Gelir Kaynağını Düzenle" onClose={() => setEditingIncome(null)}>
                    <IncomeSourceForm action={updateIncomeAction} income={editingIncome} state={updateIncomeState} />
                </Modal>
            ) : null}
        </div>
    )
}

function IncomeSourceForm({
    action,
    income,
    state,
}: {
    action: (payload: FormData) => void
    income: IncomeSourceItem | null
    state: ActionResult
}) {
    return (
        <form action={action} className="space-y-4">
            {income ? <input type="hidden" name="incomeId" value={income.id} /> : null}
            <input name="name" defaultValue={income?.name ?? ''} placeholder="Maaş, freelance, kira geliri" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" required />
            <div className="grid grid-cols-2 gap-4">
                <input name="amount" type="number" step="0.01" defaultValue={income?.amount ?? ''} placeholder="0.00" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" required />
                <select name="currency" defaultValue={income?.currency ?? 'TRY'} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <select name="billingCycle" defaultValue={income?.billingCycle ?? 'MONTHLY'} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4">
                    <option value="MONTHLY">Aylık</option>
                    <option value="YEARLY">Yıllık</option>
                </select>
                <input name="payday" type="number" min="1" max="31" defaultValue={income?.payday ?? ''} placeholder="Ödeme günü" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4" />
            </div>
            <select name="status" defaultValue={income?.status ?? 'ACTIVE'} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4">
                <option value="ACTIVE">Aktif</option>
                <option value="PAUSED">Duraklatıldı</option>
                <option value="CANCELED">İptal Edildi</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input name="isPrimary" type="checkbox" defaultChecked={income?.isPrimary ?? false} className="rounded border-white/20 bg-black" />
                Ana gelir kaynağı
            </label>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={income ? 'Geliri Güncelle' : 'Geliri Kaydet'} pendingLabel={income ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
