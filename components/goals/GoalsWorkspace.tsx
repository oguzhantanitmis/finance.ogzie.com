'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Plus, Target, CheckCircle, Clock, Trash2, Pencil, TrendingUp, TrendingDown, Sparkles, AlertTriangle } from 'lucide-react'

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

function calculateGoalSpeed(goal: GoalData) {
    const now = new Date()
    const target = new Date(goal.targetDate)
    const daysLeft = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const remaining = goal.targetAmount - goal.currentAmount

    if (goal.progressPercent >= 100) return { status: 'completed' as const, daysLeft, monthlyNeeded: 0, isOnTrack: true }
    if (daysLeft === 0) return { status: 'overdue' as const, daysLeft, monthlyNeeded: remaining, isOnTrack: false }

    const monthsLeft = Math.max(1, daysLeft / 30)
    const monthlyNeeded = remaining / monthsLeft

    // Basit hız tahmini: progress / elapsed time
    const created = new Date(goal.targetDate)
    created.setDate(created.getDate() - daysLeft - 30) // approximate creation
    const elapsed = Math.max(1, (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30))
    const currentSpeed = goal.currentAmount / elapsed
    const isOnTrack = currentSpeed >= monthlyNeeded * 0.8

    return { status: 'active' as const, daysLeft, monthlyNeeded: Math.round(monthlyNeeded * 100) / 100, isOnTrack }
}

export default function GoalsWorkspace({ goals }: Props) {
    const [showAdd, setShowAdd] = useState(false)
    const [editingGoal, setEditingGoal] = useState<GoalData | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [celebratingGoal, setCelebratingGoal] = useState<string | null>(null)
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

    // Özet istatistikler
    const totalTarget = active.reduce((s, g) => s + g.targetAmount, 0)
    const totalCurrent = active.reduce((s, g) => s + g.currentAmount, 0)
    const avgProgress = active.length > 0 ? Math.round(active.reduce((s, g) => s + g.progressPercent, 0) / active.length) : 0
    const overdueCount = active.filter((g) => new Date(g.targetDate) < new Date()).length

    return (
        <div>
            <FormMessage success={feedback?.success} message={feedback?.message} />

            {/* Özet paneli */}
            {goals.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Aktif Hedef</p>
                        <p className="text-2xl font-bold text-white">{active.length}</p>
                    </div>
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Ortalama İlerleme</p>
                        <p className="text-2xl font-bold text-[color:var(--accent-info)]">%{avgProgress}</p>
                    </div>
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Biriken / Hedef</p>
                        <p className="text-sm font-bold text-white privacy-blur">{formatCurrency(totalCurrent, 'TRY')} / {formatCurrency(totalTarget, 'TRY')}</p>
                    </div>
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Tamamlanan</p>
                        <p className="text-2xl font-bold text-[color:var(--accent-success)]">{completed.length}</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all">
                    <Plus className="w-4 h-4" /> Hedef Ekle
                </button>
            </div>

            {active.length === 0 && completed.length === 0 ? (
                <div className="fintech-card p-16 text-center">
                    <Target className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 mb-2">Henüz hedef eklenmedi.</p>
                    <p className="text-zinc-600 text-sm">Ev, araba, tatil, acil fon... bir hedef koyarak tasarrufunuzu hızlandırın.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {overdueCount > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-[color:var(--accent-warning)] text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {overdueCount} hedefin süresi geçti. Tarihlerini güncellemeyi düşünün.
                        </div>
                    )}

                    {active.length > 0 && (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Aktif Hedefler</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {active.map((goal) => (
                                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditingGoal(goal)} onDelete={() => handleDelete(goal.id)} onCelebrate={() => setCelebratingGoal(goal.id)} />
                                ))}
                            </div>
                        </div>
                    )}
                    {completed.length > 0 && (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Tamamlanan 🎉</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {completed.map((goal) => (
                                    <GoalCard key={goal.id} goal={goal} onEdit={() => setEditingGoal(goal)} onDelete={() => handleDelete(goal.id)} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Celebrate Modal */}
            {celebratingGoal && (() => {
                const goal = goals.find(g => g.id === celebratingGoal)
                if (!goal) return null
                return (
                    <Modal title="" onClose={() => setCelebratingGoal(null)}>
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-[color:var(--accent-success)]" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Tebrikler! 🎉</h3>
                            <p className="text-zinc-400 mb-4">&quot;{goal.title}&quot; hedefine ulaştınız!</p>
                            <p className="text-[color:var(--accent-success)] font-bold text-2xl privacy-blur mb-4">{formatCurrency(goal.targetAmount, 'TRY')}</p>
                            <button
                                onClick={() => setCelebratingGoal(null)}
                                className="px-8 py-3 bg-emerald-500 text-black font-bold rounded-2xl hover:bg-emerald-400 transition-all"
                            >
                                Harika!
                            </button>
                        </div>
                    </Modal>
                )
            })()}

            {showAdd && (
                <Modal title="Hedef Ekle" onClose={() => setShowAdd(false)}>
                    <GoalForm action={createAction} goal={null} state={createState} />
                </Modal>
            )}

            {editingGoal && (
                <Modal title="Hedefi Düzenle" onClose={() => setEditingGoal(null)}>
                    <GoalForm action={updateAction} goal={editingGoal} state={updateState} />
                </Modal>
            )}
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
            <input name="title" defaultValue={goal?.title ?? ''} placeholder="Hedef başlığı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
            <textarea name="description" defaultValue={goal?.description ?? ''} placeholder="Açıklama (opsiyonel)" className="w-full min-h-16 bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
            <div className="grid grid-cols-2 gap-4">
                <input name="targetAmount" type="number" step="0.01" min="0.01" defaultValue={goal?.targetAmount ?? ''} placeholder="Hedef tutar" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                <input name="targetDate" type="date" defaultValue={goal?.targetDate.slice(0, 10) ?? ''} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <input name="currentAmount" type="number" step="0.01" min="0" defaultValue={goal?.currentAmount ?? 0} placeholder="Birikmiş tutar" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                <select name="category" defaultValue={goal?.category ?? ''} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                    <option value="">Kategori seçin...</option>
                    <option value="Ev">🏠 Ev</option>
                    <option value="Araba">🚗 Araba</option>
                    <option value="Tatil">✈️ Tatil</option>
                    <option value="Eğitim">📚 Eğitim</option>
                    <option value="Acil Fon">🛡️ Acil Fon</option>
                    <option value="Yatırım">📈 Yatırım</option>
                    <option value="Teknoloji">💻 Teknoloji</option>
                    <option value="Diğer">📌 Diğer</option>
                </select>
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
    onCelebrate,
}: {
    goal: GoalData
    onEdit: () => void
    onDelete: () => void
    onCelebrate?: () => void
}) {
    const isCompleted = goal.status === 'COMPLETED'
    const speed = calculateGoalSpeed(goal)
    const isOverdue = speed.status === 'overdue'
    const justCompleted = goal.progressPercent >= 100 && !isCompleted

    const CATEGORY_EMOJI: Record<string, string> = {
        'Ev': '🏠', 'Araba': '🚗', 'Tatil': '✈️', 'Eğitim': '📚',
        'Acil Fon': '🛡️', 'Yatırım': '📈', 'Teknoloji': '💻', 'Diğer': '📌',
    }

    return (
        <div className={cn('fintech-card p-5 transition-all', isCompleted && 'border-emerald-500/30', justCompleted && 'border-emerald-500/50 bg-emerald-500/5')}>
            <div className="flex items-start justify-between mb-3 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    {isCompleted || justCompleted ? (
                        <CheckCircle className="w-5 h-5 text-[color:var(--accent-success)] shrink-0" />
                    ) : (
                        <span className="text-lg shrink-0">{goal.category ? CATEGORY_EMOJI[goal.category] || '🎯' : '🎯'}</span>
                    )}
                    <h3 className="font-semibold text-white truncate">{goal.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onEdit} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[var(--bg-hover)]">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-xl text-zinc-500 hover:text-[color:var(--accent-danger)] hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {goal.description && <p className="text-xs text-zinc-500 mb-3">{goal.description}</p>}

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-[var(--bg-hover)] rounded-full mb-3 overflow-hidden">
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isCompleted || justCompleted ? 'bg-emerald-400' : isOverdue ? 'bg-red-400' : 'bg-sky-400'
                    )}
                    style={{ width: `${Math.min(100, goal.progressPercent)}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-zinc-400 privacy-blur">{formatCurrency(goal.currentAmount, 'TRY')} / {formatCurrency(goal.targetAmount, 'TRY')}</span>
                <span className={cn('text-xs font-bold', goal.progressPercent >= 100 ? 'text-[color:var(--accent-success)]' : 'text-zinc-500')}>%{Math.min(100, Math.round(goal.progressPercent))}</span>
            </div>

            {/* Hız/Durum Analizi */}
            {!isCompleted && (
                <div className={cn('rounded-xl p-3 text-xs', speed.isOnTrack ? 'bg-emerald-500/10 text-[color:var(--accent-success)]' : 'bg-amber-500/10 text-[color:var(--accent-warning)]')}>
                    <div className="flex items-center gap-1.5 mb-1">
                        {speed.isOnTrack ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="font-medium">{speed.isOnTrack ? 'Hedefe uygun gidiyorsunuz' : 'Hedefe yetişmek için hızlanın'}</span>
                    </div>
                    {speed.daysLeft > 0 && speed.monthlyNeeded > 0 && (
                        <p className="text-zinc-500 privacy-blur">Aylık {formatCurrency(speed.monthlyNeeded, 'TRY')} ayırmanız gerekiyor • {speed.daysLeft} gün kaldı</p>
                    )}
                    {speed.daysLeft === 0 && (
                        <p className="text-[color:var(--accent-danger)]">Hedef tarihi geçti!</p>
                    )}
                </div>
            )}

            {/* Tam dolduğunda kutlama butonu */}
            {justCompleted && onCelebrate && (
                <button
                    onClick={onCelebrate}
                    className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-4 h-4" /> Kutla! 🎉
                </button>
            )}

            {/* Tarih */}
            <div className="flex items-center gap-1 mt-3 text-xs text-zinc-500">
                <Clock className="w-3 h-3 inline" />
                <span className={cn(isOverdue && 'text-[color:var(--accent-danger)]')}>
                    {new Date(goal.targetDate).toLocaleDateString('tr-TR')}
                    {isOverdue && ' (süresi geçti)'}
                </span>
            </div>
        </div>
    )
}
