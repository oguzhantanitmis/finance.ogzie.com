import { redirect } from 'next/navigation'
import { CalendarDays, Landmark, Trash2 } from 'lucide-react'

import { createRecurringExpense, deleteRecurringExpense } from '@/app/actions'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import { getMonthlyBudgetSummary, normalizeMonthlyAmount } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'
import { formatBillingCycleLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />

            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Sabit ödemeler</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Sabit Giderler</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Kira, aidat, sigorta, internet ve abonelik dışı tüm düzenli ödemelerini ayrı bir modülde tut.
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-8">
                    <div className="fintech-card p-6 md:p-7 h-fit xl:sticky xl:top-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Yeni Kayit</p>
                                <h2 className="text-2xl font-bold">Sabit Gider Ekle</h2>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center">
                                <Landmark className="w-5 h-5" />
                            </div>
                        </div>

                        <form action={createRecurringExpense} className="space-y-4">
                            <input name="name" placeholder="Kira, Turkcell Fiber, Ozel Sigorta" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="amount" type="number" step="0.01" placeholder="0.00" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                                <select name="currency" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                    <option value="TRY">TRY</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input name="category" placeholder="Barınma, fatura, sigorta..." className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                                <select name="billingCycle" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                    <option value="MONTHLY">Aylık</option>
                                    <option value="YEARLY">Yıllık</option>
                                </select>
                            </div>
                            <input name="nextPayment" type="date" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                            <textarea name="notes" placeholder="Aciklama veya hesap bilgisi" className="w-full min-h-24 bg-black border border-white/10 rounded-2xl py-3 px-4" />
                            <div className="flex items-center justify-between text-sm text-zinc-400">
                                <label className="flex items-center gap-2">
                                    <input name="autopay" type="checkbox" className="rounded border-white/20 bg-black" />
                                    Otomatik ödeme
                                </label>
                                <label className="flex items-center gap-2">
                                    <input name="isEssential" type="checkbox" defaultChecked className="rounded border-white/20 bg-black" />
                                    Kritik gider
                                </label>
                            </div>
                            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-2xl">
                                Gideri Kaydet
                            </button>
                        </form>
                    </div>

                    <div className="space-y-4">
                        <div className="fintech-card p-6 md:p-7 bg-gradient-to-r from-zinc-950 to-zinc-900">
                            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">Aylık yük</p>
                            <h3 className="text-3xl font-bold">{formatCurrency(summary.recurringLoad, 'TRY')}</h3>
                            <p className="text-zinc-400 mt-2">Aylık normalize sabit gider etkisi</p>
                        </div>

                        {summary.recurringExpenses.length === 0 ? (
                            <div className="fintech-card p-16 text-center text-zinc-400">
                                Henüz sabit gider kaydı yok.
                            </div>
                        ) : (
                            summary.recurringExpenses.map((expense) => (
                                <div key={expense.id} className="fintech-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-semibold truncate">{expense.name}</h3>
                                            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{expense.category}</span>
                                            {expense.isEssential ? <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400">Kritik</span> : null}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mt-2">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                {new Date(expense.nextPayment).toLocaleDateString('tr-TR')}
                                            </span>
                                            <span>{formatBillingCycleLabel(expense.billingCycle)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                                            <p className="text-xs text-zinc-500 uppercase tracking-[0.25em]">
                                                Aylık etki {formatCurrency(normalizeMonthlyAmount(expense.amount, expense.billingCycle), 'TRY')}
                                            </p>
                                        </div>
                                        <form action={async () => {
                                            'use server'
                                            await deleteRecurringExpense(expense.id)
                                        }}>
                                            <button className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" aria-label={`${expense.name} kaydini sil`}>
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PageShell>
        </div>
    )
}
