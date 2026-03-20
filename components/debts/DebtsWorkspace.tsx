'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'

import { addDebt, deleteDebt, updateDebt } from '@/app/actions'
import DebtTable, { type DebtView } from '@/components/DebtTable'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'

export default function DebtsWorkspace({ debts }: { debts: DebtView[] }) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingDebt, setEditingDebt] = useState<DebtView | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(addDebt, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateDebt, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!createState.success || !showAdd) return

        const timeoutId = window.setTimeout(() => {
            setShowAdd(false)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingDebt) return

        const timeoutId = window.setTimeout(() => {
            setEditingDebt(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingDebt])

    function handleDelete(debtId: string) {
        if (!confirm('Bu borcu silmek istediginize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteDebt(debtId)
            setFeedback(result)
        })
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Borç Yönetimi</h1>
                    <p className="text-zinc-500">Faiz, vergi ve maliyet analizi ile borçlarını yönet.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-white text-black px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-200"
                >
                    <Plus className="w-4 h-4" /> Borç Ekle
                </button>
            </div>

            <FormMessage success={feedback?.success} message={feedback?.message} />
            <DebtTable debts={debts} onEdit={setEditingDebt} onDelete={handleDelete} />

            {showAdd ? (
                <Modal title="Yeni Borç Ekle" onClose={() => setShowAdd(false)}>
                    <DebtForm action={createAction} debt={null} state={createState} />
                </Modal>
            ) : null}

            {editingDebt ? (
                <Modal title="Borcu Düzenle" onClose={() => setEditingDebt(null)}>
                    <DebtForm action={updateAction} debt={editingDebt} state={updateState} />
                </Modal>
            ) : null}
        </div>
    )
}

function DebtForm({
    action,
    debt,
    state,
}: {
    action: (payload: FormData) => void
    debt: DebtView | null
    state: ActionResult
}) {
    return (
        <form action={action} className="space-y-4">
            {debt ? <input type="hidden" name="debtId" value={debt.id} /> : null}
            <input name="name" defaultValue={debt?.name ?? ''} placeholder="Örn: Konut Kredisi, Kredi Kartı" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />

            <div className="grid grid-cols-2 gap-4">
                <select name="type" defaultValue={debt?.type ?? 'CREDIT_CARD'} className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1">
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="LOAN">Banka Kredisi</option>
                    <option value="KMH">KMH / Artı Para</option>
                    <option value="PERSONAL">Şahsi Borç</option>
                    <option value="MANUAL">Diğer</option>
                </select>
                <input name="interestRate" type="number" step="0.01" defaultValue={debt?.interestRate ?? 0} placeholder="Faiz Oranı (%)" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <input name="totalBalance" type="number" step="0.01" defaultValue={debt?.totalBalance ?? ''} placeholder="Toplam bakiye" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />
                <input name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} placeholder="Kalan bakiye" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <input name="limit" type="number" step="0.01" defaultValue={debt?.limit ?? ''} placeholder="Limit (opsiyonel)" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                <input name="totalPrincipal" type="number" step="0.01" defaultValue={debt?.totalPrincipal ?? ''} placeholder="Anapara (opsiyonel)" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <input name="cutOffDay" type="number" min="1" max="31" defaultValue={debt?.cutOffDay ?? ''} placeholder="Hesap kesim günü" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                <input name="paymentDueDay" type="number" min="1" max="31" defaultValue={debt?.paymentDueDay ?? ''} placeholder="Son ödeme günü" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <input name="installments" type="number" min="1" defaultValue={debt?.installments ?? ''} placeholder="Taksit sayısı" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                <input name="remainingInstallments" type="number" min="0" defaultValue={debt?.remainingInstallments ?? ''} placeholder="Kalan taksit" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <input name="minPaymentRate" type="number" step="0.01" defaultValue={debt?.minPaymentRate ?? 0.2} placeholder="Asgari oran" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                <input name="kkdfRate" type="number" step="0.01" defaultValue={debt?.kkdfRate ?? 0.15} placeholder="KKDF" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                <input name="bsmvRate" type="number" step="0.01" defaultValue={debt?.bsmvRate ?? 0.15} placeholder="BSMV" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
            </div>

            <input name="dueDate" type="date" defaultValue={debt?.dueDate ? debt.dueDate.slice(0, 10) : ''} className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />

            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={debt ? 'Borcu Güncelle' : 'Borcu Kaydet'} pendingLabel={debt ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
