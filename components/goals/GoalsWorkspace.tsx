'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Plus, Target, CheckCircle, Clock, Trash2, Pencil } from 'lucide-react'

import { createGoalAction, deleteGoalAction, updateGoalAction } from '@/app/goals/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { cn, formatCurrency } from '@/lib/utils'

interface GoalData {
    id: string
    title: string
    description: string | null
    targetAmount: number
    currentAmount: number
    targetDate: string
    status: string
    category: string | null
    progressPercent: number
}

interface Props {
    goals: GoalData[]
}

export default function GoalsWorkspace({ goals }: Props) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingGoal, setEditingGoal] = useState<GoalData | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(createGoalAction, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateGoalAction, EMPTY_ACTION_RESULT)
    const active = goals.filter((goal) => goal.status === 'GOAL_ACTIVE')
    const completed = goals.filter((goal) => goal.status === 'COMPLETED')

    useEffect(() => {
        if (!createState.success || !showAdd) return

        const timeoutId = window.setTimeout(() => {
            setShowAdd(false)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingGoal) return

        const timeoutId = window.setTimeout(() => {
            setEditingGoal(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingGoal])

    function handleDelete(goalId: string) {
        if (!confirm('Bu hedefi silmek istediginize emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteGoalAction(goalId)
            setFeedback(result)
        })
    }

    return (
        <div>
            <FormMessage success={feedback?.success} message={feedback?.message} />

            <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all">
                    <Plus className="w-4 h-4" /> Hedef Ekle
                </button>
            </div>

            {active.length === 0 && completed.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">Henüz hedef eklenmedi.</div>
            ) : (
                <div className="space-y-8">
                    {active.length > 0 ? (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Aktif Hedefler</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {active.map((goal) => (
                                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditingGoal(goal)} onDelete={() => handleDelete(goal.id)} />
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {completed.length > 0 ? (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Tamamlanan</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {completed.map((goal) => (
                                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditingGoal(goal)} onDelete={() => handleDelete(goal.id)} />
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {showAdd ? (
                <Modal title="Hedef Ekle" onClose={() => setShowAdd(false)}>
                    <GoalForm action={createAction} goal={null} state={createState} />
                </Modal>
            ) : null}

            {editingGoal ? (
                <Modal title="Hedefi Düzenle" onClose={() => setEditingGoal(null)}>
                    <GoalForm action={updateAction} goal={editingGoal} state={updateState} />
                </Modal>
            ) : null}
        </div>
    )
}

function GoalForm({
    action,
    goal,
    state,
}: {
    action: (payload: FormData) => void
    goal: GoalData | null
    state: ActionResult
}) {
    return (
        <form action={action} className="space-y-4">
            {goal ? <input type="hidden" name="goalId" value={goal.id} /> : null}
            <input name="title" defaultValue={goal?.title ?? ''} placeholder="Hedef başlığı" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
            <textarea name="description" defaultValue={goal?.description ?? ''} placeholder="Açıklama (opsiyonel)" className="w-full min-h-16 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
            <div className="grid grid-cols-2 gap-4">
                <input name="targetAmount" type="number" step="0.01" min="0.01" defaultValue={goal?.targetAmount ?? ''} placeholder="Hedef tutar" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                <input name="targetDate" type="date" defaultValue={goal?.targetDate.slice(0, 10) ?? ''} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input name="currentAmount" type="number" step="0.01" min="0" defaultValue={goal?.currentAmount ?? 0} placeholder="Birikmiş tutar" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                <input name="category" defaultValue={goal?.category ?? ''} placeholder="Kategori (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
            </div>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={goal ? 'Hedefi Güncelle' : 'Hedefi Kaydet'} pendingLabel={goal ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}

function GoalCard({
    goal,
    onEdit,
    onDelete,
}: {
    goal: GoalData
    onEdit: () => void
    onDelete: () => void
}) {
    const isCompleted = goal.status === 'COMPLETED'
    const isOverdue = !isCompleted && new Date(goal.targetDate) < new Date()

    return (
        <div className={cn('fintech-card p-5', isCompleted && 'border-emerald-500/30')}>
            <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <Target className="w-5 h-5 text-sky-400 shrink-0" />}
                    <h3 className="font-semibold text-white truncate">{goal.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onEdit} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {goal.description ? <p className="text-xs text-zinc-500 mb-3">{goal.description}</p> : null}
            <div className="w-full h-2 bg-white/5 rounded-full mb-3">
                <div
                    className={cn('h-full rounded-full transition-all', isCompleted ? 'bg-emerald-400' : 'bg-sky-400')}
                    style={{ width: `${goal.progressPercent}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{formatCurrency(goal.currentAmount, 'TRY')} / {formatCurrency(goal.targetAmount, 'TRY')}</span>
                <span className={cn('text-xs', isOverdue ? 'text-red-400' : 'text-zinc-500')}>
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(goal.targetDate).toLocaleDateString('tr-TR')}
                </span>
            </div>
        </div>
    )
}
