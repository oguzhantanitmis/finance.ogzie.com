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

function moneyValue(value: number) {
    return (Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100).toFixed(2)
}

function BudgetMoneyField({ name, label, value, help }: { name: string; label: string; value: number; help: string }) {
    return (
        <div>
            <label className="form-label">{label}</label>
            <input
                name={name}
                type="number"
                step="0.01"
                defaultValue={moneyValue(value)}
                placeholder="0,00"
                className="form-input font-mono"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{help}</p>
        </div>
    )
}

export default function BudgetWorkspace({
    summary,
}: {
    summary: {
        openingCash: number
        plannedIncome: number
        fixedCommitments: number
        debtCommitments: number
        plannedReceivableCollection: number
        savingGoal: number
        debtPaymentBudget: number
        manualAdjustment: number
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
                            <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Gelir kaynakları</p>
                            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Düzenli gelir ekle</h2>
                        </div>
                        <PiggyBank className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <button onClick={() => setShowIncomeModal(true)} className="w-full btn-primary py-4 rounded-2xl">
                        Yeni Gelir Kaynağı Ekle
                    </button>
                </div>

                <div className="fintech-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Ay ayarları</p>
                            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Ay Ayarı</h2>
                        </div>
                        <WalletCards className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <form action={monthAction} className="space-y-4">
                        <div>
                            <label className="form-label">Ay / Yıl</label>
                            <input type="month" name="month" defaultValue={summary.month.slice(0, 7)} className="form-input" />
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bu ay için manuel bütçe varsayımlarını düzenler.</p>
                        </div>

                        <BudgetMoneyField name="openingCash" label="Aylık başlangıç nakdi" value={summary.openingCash} help="Ay başında nakit ve banka hesaplarında varsaydığın başlangıç." />
                        <BudgetMoneyField name="plannedIncome" label="Beklenen gelir" value={summary.plannedIncome} help="Düzenli gelirlerden otomatik gelir; gerekirse manuel düzelt." />
                        <BudgetMoneyField name="fixedCommitments" label="Beklenen gider" value={summary.fixedCommitments} help="Abonelik ve sabit giderlerin toplam aylık etkisi." />
                        <BudgetMoneyField name="debtCommitments" label="Planlanan borç ödemesi" value={summary.debtCommitments} help="Bu ay beklenen kredi, kart, KMH ve verecek ödemeleri." />
                        <BudgetMoneyField name="plannedReceivableCollection" label="Planlanan alacak tahsilatı" value={summary.plannedReceivableCollection} help="Bu ay tahsil etmeyi beklediğin kişi bazlı alacaklar." />
                        <BudgetMoneyField name="savingGoal" label="Aylık tasarruf hedefi" value={summary.savingGoal} help="Hedeflere ayırmak istediğin net tutar." />
                        <BudgetMoneyField name="debtPaymentBudget" label="Borç kapatma bütçesi" value={summary.debtPaymentBudget} help="Serbest nakitten borç kapatmaya ayıracağın maksimum tutar." />
                        <BudgetMoneyField name="manualAdjustment" label="Manuel düzeltme" value={summary.manualAdjustment} help="Beklenmeyen nakit giriş/çıkış düzeltmesi. Negatif değer çıkış anlamına gelir." />

                        <input type="hidden" name="freeCash" value={moneyValue(summary.freeCash)} />
                        <div className="rounded-2xl p-4" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-hover)' }}>
                            <p className="form-label mb-1">Net nakit akışı (otomatik)</p>
                            <p className={summary.freeCash < 0 ? 'text-[color:var(--accent-danger)] font-bold privacy-blur' : 'text-[color:var(--accent-success)] font-bold privacy-blur'}>
                                {formatCurrency(summary.freeCash, 'TRY')}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Bu alan hesap sonucudur; editlenebilir gibi gösterilmez.</p>
                        </div>

                        <BudgetMoneyField name="bufferTarget" label="Aylık tampon hedefi" value={summary.bufferTarget} help="Ay sonunda bırakmak istediğin güvenlik payı." />
                        <div>
                            <label className="form-label">Notlar</label>
                            <textarea name="notes" defaultValue={summary.notes ?? ''} placeholder="Bu ayki özel durumlar, maaş farkı, tek seferlik ödeme notları" className="form-input min-h-24" />
                        </div>
                        <FormMessage success={monthState.success} message={monthState.message} />
                        <SubmitButton label="Bütçeyi Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </div>
            </div>

            <div className="space-y-6">
                <FormMessage success={feedback?.success} message={feedback?.message} />

                <div className="fintech-card p-6 md:p-7">
                    <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Uyarılar</h2>
                    {summary.alerts.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Açık uyarın yok. Plan temiz.</p>
                    ) : (
                        <div className="space-y-3">
                            {summary.alerts.map((alert) => (
                                <div key={alert.id} className="rounded-3xl bg-[var(--bg-hover)] p-4 flex items-start justify-between gap-4" style={{ border: '1px solid var(--border-default)' }}>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>{formatAlertTypeLabel(alert.type)}</p>
                                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{alert.title}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{alert.content}</p>
                                    </div>
                                    <button onClick={() => handleDismissAlert(alert.id)} className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        Kapat
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="fintech-card p-6 md:p-7">
                    <h2 className="text-2xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Gelir kaynakları</h2>
                    {summary.incomeSources.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Gelir kaydı yok. Gelir girmezsen serbest nakit hesapları eksik kalır.</p>
                    ) : (
                        <div className="space-y-3">
                            {summary.incomeSources.map((income) => (
                                <div key={income.id} className="rounded-3xl bg-[var(--bg-hover)] p-4 flex items-center justify-between gap-4" style={{ border: '1px solid var(--border-default)' }}>
                                    <div>
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{income.name}</p>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                            {formatBillingCycleLabel(income.billingCycle)}
                                            {income.payday ? ` • Gün ${income.payday}` : ''}
                                            {income.isPrimary ? ' • Ana gelir' : ''}
                                            {income.status !== 'ACTIVE' ? ` • ${formatRecordStatusLabel(income.status)}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(income.amount, income.currency)}</p>
                                        <button onClick={() => setEditingIncome(income)} className="p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteIncome(income.id)} className="p-2 transition-colors" style={{ color: 'var(--text-muted)' }}>
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
            <input name="name" defaultValue={income?.name ?? ''} placeholder="Maaş, freelance, kira geliri" className="form-input" required />
            <div className="grid grid-cols-2 gap-4">
                <input name="amount" type="number" step="0.01" defaultValue={income?.amount ?? ''} placeholder="0.00" className="form-input" required />
                <select name="currency" defaultValue={income?.currency ?? 'TRY'} className="form-input form-select">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <select name="billingCycle" defaultValue={income?.billingCycle ?? 'MONTHLY'} className="form-input form-select">
                    <option value="MONTHLY">Aylık</option>
                    <option value="YEARLY">Yıllık</option>
                </select>
                <input name="payday" type="number" min="1" max="31" defaultValue={income?.payday ?? ''} placeholder="Ödeme günü" className="form-input" />
            </div>
            <select name="status" defaultValue={income?.status ?? 'ACTIVE'} className="form-input form-select">
                <option value="ACTIVE">Aktif</option>
                <option value="PAUSED">Duraklatıldı</option>
                <option value="CANCELED">İptal Edildi</option>
            </select>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <input name="isPrimary" type="checkbox" defaultChecked={income?.isPrimary ?? false} className="rounded" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }} />
                Ana gelir kaynağı
            </label>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={income ? 'Geliri Güncelle' : 'Geliri Kaydet'} pendingLabel={income ? 'Güncelleniyor...' : 'Kaydediliyor...'} />
        </form>
    )
}
