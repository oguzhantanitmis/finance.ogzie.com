import { startOfMonth } from 'date-fns'
import { redirect } from 'next/navigation'
import { PiggyBank, Trash2, WalletCards } from 'lucide-react'

import { createIncomeSource, deleteIncomeSource, dismissBudgetAlert, updateBudgetMonth } from '@/app/actions'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { getCurrentUser } from '@/lib/server-auth'
import { formatAlertTypeLabel, formatBillingCycleLabel } from '@/lib/ui-text'
import { formatCurrency } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function monthValue(date: Date) {
    return startOfMonth(date).toISOString().slice(0, 10)
}

export default async function BudgetPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const summary = await getMonthlyBudgetSummary(user.id)
    const month = monthValue(summary.month)

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />

            <PageShell width="genis">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Bütçe yönetimi</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Aylık bütçe merkezi</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Gelirlerini gir, sistem sabit yükler ve borç ödemeleri sonrasında elinde kalan serbest nakdi göstersin.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Planlanan Gelir</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.plannedIncome, 'TRY')}</p>
                    </div>
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Sabit yük</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.fixedCommitments, 'TRY')}</p>
                    </div>
                    <div className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Borç baskısı</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.debtCommitments, 'TRY')}</p>
                    </div>
                    <div className={`fintech-card p-5 ${summary.freeCash < 0 ? 'border-red-500/30' : 'border-emerald-500/20'}`}>
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Serbest Nakit</p>
                        <p className={`text-2xl font-bold ${summary.freeCash < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(summary.freeCash, 'TRY')}</p>
                    </div>
                </div>

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
                            <form action={createIncomeSource} className="space-y-4">
                                <input name="name" placeholder="Maaş, freelance, kira geliri" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="amount" type="number" step="0.01" placeholder="0.00" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" required />
                                    <select name="currency" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <select name="billingCycle" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4">
                                        <option value="MONTHLY">Aylık</option>
                                        <option value="YEARLY">Yıllık</option>
                                    </select>
                                    <input name="payday" type="number" min="1" max="31" placeholder="Ödeme günü" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-zinc-400">
                                    <input name="isPrimary" type="checkbox" className="rounded border-white/20 bg-black" />
                                    Ana gelir kaynağı
                                </label>
                                <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-2xl">
                                    Geliri Kaydet
                                </button>
                            </form>
                        </div>

                        <div className="fintech-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Ay ayarları</p>
                                    <h2 className="text-2xl font-bold">Ay ayarı</h2>
                                </div>
                                <WalletCards className="w-5 h-5 text-zinc-500" />
                            </div>
                            <form action={updateBudgetMonth} className="space-y-4">
                                <input type="hidden" name="month" value={month} />
                                <input name="plannedIncome" type="number" step="0.01" defaultValue={summary.plannedIncome} placeholder="Planlanan gelir" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <input name="fixedCommitments" type="number" step="0.01" defaultValue={summary.fixedCommitments} placeholder="Sabit giderler" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <input name="debtCommitments" type="number" step="0.01" defaultValue={summary.debtCommitments} placeholder="Borç ödemeleri" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <input name="freeCash" type="number" step="0.01" defaultValue={summary.freeCash} placeholder="Serbest nakit" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <input name="bufferTarget" type="number" step="0.01" defaultValue={summary.bufferTarget} placeholder="Hedef tampon" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <textarea name="notes" defaultValue={summary.notes ?? ''} placeholder="Ay notları ve manuel ayarlar" className="w-full min-h-24 bg-black border border-white/10 rounded-2xl py-3 px-4" />
                                <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-2xl">
                                    Bütçeyi güncelle
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="fintech-card p-6 md:p-7">
                            <h2 className="text-2xl font-bold mb-5">Uyarılar</h2>
                            {summary.alerts.length === 0 ? (
                                <p className="text-zinc-400">Açık uyarın yok. Plan temiz.</p>
                            ) : (
                                <div className="space-y-3">
                                    {summary.alerts.map((alert) => (
                                        <div key={alert.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{formatAlertTypeLabel(alert.type)}</p>
                                                <h3 className="font-semibold mb-1">{alert.title}</h3>
                                                <p className="text-sm text-zinc-400">{alert.content}</p>
                                            </div>
                                            <form action={async () => {
                                                'use server'
                                                await dismissBudgetAlert(alert.id)
                                            }}>
                                                <button className="text-xs text-zinc-500 hover:text-white">Kapat</button>
                                            </form>
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
                                        <div key={income.id} className="rounded-3xl border border-white/8 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">{income.name}</p>
                                                <p className="text-sm text-zinc-500">
                                                    {formatBillingCycleLabel(income.billingCycle)}
                                                    {income.payday ? ` • Gün ${income.payday}` : ''}
                                                    {income.isPrimary ? ' • Ana gelir' : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold">{formatCurrency(income.amount, income.currency)}</p>
                                                <form action={async () => {
                                                    'use server'
                                                    await deleteIncomeSource(income.id)
                                                }}>
                                                    <button className="p-2 text-zinc-600 hover:text-red-500" aria-label={`${income.name} kaydini sil`}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </PageShell>
        </div>
    )
}
