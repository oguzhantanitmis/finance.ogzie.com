'use client'

import { useState } from 'react'
import { Plus, Target, CheckCircle, Clock, Trash2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { createGoalAction, deleteGoalAction } from '@/app/goals/actions'

interface GoalData {
    id: string; title: string; description: string | null; targetAmount: number; currentAmount: number
    targetDate: string; status: string; category: string | null; progressPercent: number
}

interface Props {
    goals: GoalData[]
}

export default function GoalsWorkspace({ goals }: Props) {
    const [showAdd, setShowAdd] = useState(false)
    const active = goals.filter((g) => g.status === 'GOAL_ACTIVE')
    const completed = goals.filter((g) => g.status === 'COMPLETED')

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-8">
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all">
                    <Plus className="w-4 h-4" /> Hedef Ekle
                </button>
            </div>

            {active.length === 0 && completed.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">Henüz hedef eklenmedi.</div>
            ) : (
                <div className="space-y-8">
                    {active.length > 0 && (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Aktif Hedefler</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {active.map((g) => <GoalCard key={g.id} goal={g} />)}
                            </div>
                        </div>
                    )}
                    {completed.length > 0 && (
                        <div>
                            <h2 className="text-sm uppercase tracking-[0.25em] text-zinc-500 mb-4">Tamamlanan</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
                    <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Hedef Ekle</h2>
                            <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">✕</button>
                        </div>
                        <form action={createGoalAction} className="space-y-4">
                            <input name="title" placeholder="Hedef başlığı" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                            <textarea name="description" placeholder="Açıklama (opsiyonel)" className="w-full min-h-16 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="targetAmount" type="number" step="0.01" placeholder="Hedef tutar" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                                <input name="targetDate" type="date" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                            </div>
                            <input name="category" placeholder="Kategori (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <button type="submit" onClick={() => setShowAdd(false)} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all">
                                Hedefi Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function GoalCard({ goal }: { goal: GoalData }) {
    const isCompleted = goal.status === 'COMPLETED'
    const isOverdue = !isCompleted && new Date(goal.targetDate) < new Date()

    return (
        <div className={cn('fintech-card p-5', isCompleted && 'border-emerald-500/30')}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Target className="w-5 h-5 text-sky-400" />}
                    <h3 className="font-semibold text-white">{goal.title}</h3>
                </div>
                {!isCompleted && (
                    <form action={() => deleteGoalAction(goal.id)}>
                        <button type="submit" className="text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </form>
                )}
            </div>
            {goal.description && <p className="text-xs text-zinc-500 mb-3">{goal.description}</p>}
            {/* Progress Bar */}
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
