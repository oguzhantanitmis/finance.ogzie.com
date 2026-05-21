'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { CalendarDays, Landmark, Pencil, Trash2 } from 'lucide-react'

import { createRecurringExpense, deleteRecurringExpense, updateRecurringExpense } from '@/app/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { formatBillingCycleLabel, formatRecordStatusLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

type RecurringExpenseItem = {
    id: string
    name: string
    amount: number
    currency: string
    billingCycle: string
    nextPayment: string
    category: string
    status: string
    isEssential: boolean
    autopay: boolean
    notes: string | null
}

export default function RecurringWorkspace({
    recurringExpenses,
    recurringLoad,
}: {
    recurringExpenses: RecurringExpenseItem[]
    recurringLoad: number
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingExpense, setEditingExpense] = useState<RecurringExpenseItem | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(createRecurringExpense, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateRecurringExpense, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!createState.success || !showAdd) return

        const timeoutId = window.setTimeout(() => {
            setShowAdd(false)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingExpense) return

        const timeoutId = window.setTimeout(() => {
            setEditingExpense(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingExpense])

    function handleDelete(expenseId: string) {
        if (!confirm('Bu sabit gider kaydini silmek istediginize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteRecurringExpense(expenseId)
            setFeedback(result)
        })
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-8">
            <div className="fintech-card p-6 md:p-7 h-fit xl:sticky xl:top-10">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Sabit giderler</p>
                        <h2 className="text-2xl font-bold">Düzenli Ödeme Merkezi</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center">
                        <Landmark className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-zinc-400 text-sm mb-6">
                    Kira, aidat, sigorta ve abonelik dışı düzenli yüklerini burada yönet.
                </p>
                <button onClick={() => setShowAdd(true)} className="w-full bg-white text-black font-bold py-4 rounded-2xl">
                    Yeni Sabit Gider Ekle
                </button>
                <div className="rounded-3xl border border-white/8 bg-[var(--bg-hover)] p-4 mt-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Aylık yük</p>
                    <h3 className="text-3xl font-bold privacy-blur">{formatCurrency(recurringLoad, 'TRY')}</h3>
                    <p className="text-zinc-400 mt-2 text-sm">Aylık normalize sabit gider etkisi</p>
                </div>
            </div>

            <div className="space-y-4">
                <FormMessage success={feedback?.success} message={feedback?.message} />

                {recurringExpenses.length === 0 ? (
                    <div className="fintech-card p-16 text-center text-zinc-400">
                        Henüz sabit gider kaydı yok.
                    </div>
                ) : (
                    recurringExpenses.map((expense) => (
                        <div key={expense.id} className="fintech-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="text-lg font-semibold truncate">{expense.name}</h3>
                                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{expense.category}</span>
                                    {expense.isEssential ? <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--accent-warning)]">Kritik</span> : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mt-2">
                                    <span className="flex items-center gap-1 privacy-blur">
                                        <CalendarDays className="w-3.5 h-3.5" />
                                        {new Date(expense.nextPayment).toLocaleDateString('tr-TR')}
                                    </span>
                                    <span>{formatBillingCycleLabel(expense.billingCycle)}</span>
                                    <span>{formatRecordStatusLabel(expense.status)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xl font-bold privacy-blur">{formatCurrency(expense.amount, expense.currency)}</p>
                                </div>
                                <button onClick={() => setEditingExpense(expense)} className="p-3 text-zinc-600 hover:text-white hover:bg-[var(--bg-elevated)] rounded-xl transition-all">
                                    <Pencil className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleDelete(expense.id)} className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showAdd ? (
                <Modal title="Sabit Gider Ekle" onClose={() => setShowAdd(false)}>
                    <RecurringExpenseForm action={createAction} expense={null} state={createState} />
                </Modal>
            ) : null}

            {editingExpense ? (
                <Modal title="Sabit Gideri Düzenle" onClose={() => setEditingExpense(null)}>
                    <RecurringExpenseForm action={updateAction} expense={editingExpense} state={updateState} />
                </Modal>
            ) : null}
        </div>
    )
}

function RecurringExpenseForm({
    action,
    expense,
    state,
}: {
    action: (payload: FormData) => void
    expense: RecurringExpenseItem | null
    state: ActionResult
}) {
    return (
        <form action={action} className="space-y-4">
            {expense ? <input type="hidden" name="expenseId" value={expense.id} /> : null}
            <input name="name" defaultValue={expense?.name ?? ''} placeholder="Kira, Turkcell Fiber, Özel Sigorta" className="form-input" required />
            <div className="grid grid-cols-2 gap-4">
                <input name="amount" type="number" step="0.01" defaultValue={expense?.amount ?? ''} placeholder="0.00" className="form-input" required />
                <select name="currency" defaultValue={expense?.currency ?? 'TRY'} className="form-input form-select">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input name="category" defaultValue={expense?.category ?? ''} placeholder="Barınma, fatura, sigorta..." className="form-input" required />
                <select name="billingCycle" defaultValue={expense?.billingCycle ?? 'MONTHLY'} className="form-input form-select">
                    <option value="MONTHLY">Aylık</option>
                    <option value="YEARLY">Yıllık</option>
                </select>
            </div>
            <input name="nextPayment" type="date" defaultValue={expense?.nextPayment.slice(0, 10) ?? ''} className="form-input" required />
            <select name="status" defaultValue={expense?.status ?? 'ACTIVE'} className="form-input form-select">
                <option value="ACTIVE">Aktif</option>
                <option value="PAUSED">Duraklatıldı</option>
                <option value="CANCELED">İptal Edildi</option>
            </select>
            <textarea
                name="notes"
                defaultValue={expense?.notes ?? ''}
                placeholder="Açıklama veya hesap bilgisi"
                className="form-input min-h-24"
            />
            <div className="flex items-center justify-between text-sm text-zinc-400">
                <label className="flex items-center gap-2">
                    <input
                        name="autopay"
                        type="checkbox"
                        defaultChecked={expense?.autopay ?? false}
                        className="rounded border-white/20 bg-black"
                    />
                    Otomatik ödeme
                </label>
                <label className="flex items-center gap-2">
                    <input name="isEssential" type="checkbox" defaultChecked={expense?.isEssential ?? true} className="rounded border-white/20 bg-black" />
                    Kritik gider
                </label>
            </div>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={expense ? 'Gideri Güncelle' : 'Gideri Kaydet'} pendingLabel={expense ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
