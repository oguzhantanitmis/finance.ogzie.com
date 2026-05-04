'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowDownLeft, ArrowUpRight, CalendarDays, Clock, Pencil, Trash2, UserRoundPen } from 'lucide-react'
import type { Account } from '@prisma/client'

import AccountSelect from '@/components/accounts/AccountSelect'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { cn, formatCurrency } from '@/lib/utils'
import {
    addRPNoteAction,
    createRPAction,
    deletePersonAction,
    deleteRPAction,
    recordCollectionAction,
    recordPaymentToPersonAction,
    rescheduleRPAction,
    updatePersonAction,
    updateRPAction,
} from '@/app/people/actions'

type ModalState = 'closed' | 'editPerson' | 'addRP' | 'editRP' | 'collect' | 'pay' | 'reschedule' | 'note'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
    OPEN: { text: 'Açık', color: 'text-[color:var(--accent-info)] bg-sky-500/10' },
    PARTIAL: { text: 'Kısmi', color: 'text-[color:var(--accent-warning)] bg-amber-500/10' },
    CLOSED: { text: 'Kapandı', color: 'text-[color:var(--accent-success)] bg-emerald-500/10' },
    OVERDUE: { text: 'Gecikmiş', color: 'text-[color:var(--accent-danger)] bg-red-500/10' },
}

interface Props {
    person: {
        id: string
        name: string
        phone: string | null
        email: string | null
        notes: string | null
        receivablesPayables: Array<{
            id: string
            type: string
            title: string | null
            category: string | null
            description: string
            principalAmount: number | null
            totalAmount: number | null
            originalAmount: number
            paidAmount: number
            remainingAmount: number
            currency: string
            startDate: string | null
            dueDate: string | null
            status: string
            riskLevel: string
            paymentPlanType: string
            installmentPeriod: string | null
            internalNote: string | null
            notes: string | null
            createdAt: string
            installments: Array<{
                id: string
                installmentNo: number
                dueDate: string
                plannedAmount: number
                paidAmount: number
                remainingAmount: number
                status: string
                paidDate: string | null
                delayDays: number
                description: string | null
                note: string | null
            }>
            transactions: Array<{
                id: string
                amount: number
                transactionDate: string
                description: string | null
                installmentId: string | null
                account: { name: string } | null
            }>
            notesList: Array<{ id: string; note: string; noteType: string; createdAt: string }>
            events: Array<{ id: string; eventType: string; eventText: string; createdAt: string }>
        }>
    }
    accounts: Account[]
}

export default function PersonDetailWorkspace({ person, accounts }: Props) {
    const router = useRouter()
    const [modal, setModal] = useState<ModalState>('closed')
    const [selectedRPId, setSelectedRPId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [updatePersonState, updatePersonActionState] = useActionState(updatePersonAction, EMPTY_ACTION_RESULT)
    const [createRPState, createRPActionState] = useActionState(createRPAction, EMPTY_ACTION_RESULT)
    const [updateRPState, updateRPActionState] = useActionState(updateRPAction, EMPTY_ACTION_RESULT)
    const [collectionState, collectionActionState] = useActionState(recordCollectionAction, EMPTY_ACTION_RESULT)
    const [paymentState, paymentActionState] = useActionState(recordPaymentToPersonAction, EMPTY_ACTION_RESULT)
    const [rescheduleState, rescheduleActionState] = useActionState(rescheduleRPAction, EMPTY_ACTION_RESULT)
    const [noteState, noteActionState] = useActionState(addRPNoteAction, EMPTY_ACTION_RESULT)

    const receivables = person.receivablesPayables.filter((rp) => rp.type === 'RECEIVABLE')
    const payables = person.receivablesPayables.filter((rp) => rp.type === 'PAYABLE')
    const totalReceivable = receivables.filter((item) => item.status !== 'CLOSED').reduce((sum, item) => sum + item.remainingAmount, 0)
    const totalPayable = payables.filter((item) => item.status !== 'CLOSED').reduce((sum, item) => sum + item.remainingAmount, 0)
    const selectedRP = person.receivablesPayables.find((rp) => rp.id === selectedRPId)

    useEffect(() => {
        if (!updatePersonState.success || modal !== 'editPerson') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setFeedback(updatePersonState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updatePersonState, modal])

    useEffect(() => {
        if (!createRPState.success || modal !== 'addRP') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setFeedback(createRPState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createRPState, modal])

    useEffect(() => {
        if (!updateRPState.success || modal !== 'editRP') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedRPId(null)
            setFeedback(updateRPState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateRPState, modal])

    useEffect(() => {
        if (!collectionState.success || modal !== 'collect') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedRPId(null)
            setFeedback(collectionState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [collectionState, modal])

    useEffect(() => {
        if (!paymentState.success || modal !== 'pay') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedRPId(null)
            setFeedback(paymentState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [paymentState, modal])

    useEffect(() => {
        if (!rescheduleState.success || modal !== 'reschedule') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedRPId(null)
            setFeedback(rescheduleState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [rescheduleState, modal])

    useEffect(() => {
        if (!noteState.success || modal !== 'note') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedRPId(null)
            setFeedback(noteState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [noteState, modal])

    function handleDeletePerson() {
        if (!confirm('Bu kisiyi ve bagli acik kayitlarini silmek istediginize emin misiniz?')) return

        startDeleteTransition(async () => {
            const result = await deletePersonAction(person.id)
            if (result.success) {
                router.push('/people')
                return
            }
            setFeedback(result)
        })
    }

    function handleDeleteRP(rpId: string) {
        if (!confirm('Bu alacak/verecek kaydini silmek istediginize emin misiniz?')) return

        startDeleteTransition(async () => {
            const result = await deleteRPAction(rpId, person.id)
            setFeedback(result)
        })
    }

    return (
        <div>
            <FormMessage success={feedback?.success} message={feedback?.message} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Alacak</p>
                    <p className="text-2xl font-bold text-[color:var(--accent-success)] privacy-blur">{formatCurrency(totalReceivable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Verecek</p>
                    <p className="text-2xl font-bold text-[color:var(--accent-danger)] privacy-blur">{formatCurrency(totalPayable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Net Durum</p>
                    <p className={cn('text-2xl font-bold privacy-blur', totalReceivable - totalPayable >= 0 ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                        {formatCurrency(totalReceivable - totalPayable, 'TRY')}
                    </p>
                </div>
            </div>

            <div className="fintech-card p-5 mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 text-sm text-zinc-400">
                        {person.phone ? <p className="privacy-blur">Telefon: {person.phone}</p> : null}
                        {person.email ? <p>E-posta: {person.email}</p> : null}
                        {person.notes ? <p>Not: {person.notes}</p> : null}
                        {!person.phone && !person.email && !person.notes ? <p>Ek kişi bilgisi girilmemiş.</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setModal('editPerson')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold"
                        >
                            <UserRoundPen className="w-4 h-4" /> Kişiyi Düzenle
                        </button>
                        <button
                            onClick={handleDeletePerson}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-300 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-4 h-4" /> Kişiyi Sil
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={() => setModal('addRP')}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <Plus className="w-4 h-4" /> Alacak / Verecek Ekle
                </button>
            </div>

            {person.receivablesPayables.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    Henüz alacak veya verecek kaydı yok.
                </div>
            ) : (
                <div className="space-y-4">
                    {person.receivablesPayables.map((rp) => {
                        const statusMeta = STATUS_LABELS[rp.status] ?? STATUS_LABELS.OPEN
                        const isReceivable = rp.type === 'RECEIVABLE'

                        return (
                            <div key={rp.id} className="fintech-card p-5 md:p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            {isReceivable ? (
                                                <ArrowDownLeft className="w-4 h-4 text-[color:var(--accent-success)]" />
                                            ) : (
                                                <ArrowUpRight className="w-4 h-4 text-[color:var(--accent-danger)]" />
                                            )}
                                            <h3 className="font-semibold text-white">{rp.description}</h3>
                                            <span className={cn('text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-lg', statusMeta.color)}>
                                                {statusMeta.text}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                                            <span>{isReceivable ? 'Alacak' : 'Verecek'}</span>
                                            {rp.dueDate ? (
                                                <span className="flex items-center gap-1 privacy-blur">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {new Date(rp.dueDate).toLocaleDateString('tr-TR')}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className="text-right">
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kalan</p>
                                            <p className={cn('text-xl font-bold privacy-blur', isReceivable ? 'text-[color:var(--accent-success)]' : 'text-[color:var(--accent-danger)]')}>
                                                {formatCurrency(rp.remainingAmount, rp.currency)}
                                            </p>
                                            <p className="text-xs text-zinc-600 privacy-blur">/ {formatCurrency(rp.originalAmount, rp.currency)}</p>
                                        </div>
                                        {rp.status !== 'CLOSED' ? (
                                            <button
                                                onClick={() => {
                                                    setSelectedRPId(rp.id)
                                                    setModal(isReceivable ? 'collect' : 'pay')
                                                }}
                                                className={cn(
                                                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                                                    isReceivable ? 'bg-emerald-500/20 text-[color:var(--accent-success)] hover:bg-emerald-500/30' : 'bg-red-500/20 text-[color:var(--accent-danger)] hover:bg-red-500/30',
                                                )}
                                            >
                                                {isReceivable ? 'Tahsilat Gir' : 'Ödeme Yap'}
                                            </button>
                                        ) : null}
                                        {rp.status !== 'CLOSED' ? (
                                            <button
                                                onClick={() => {
                                                    setSelectedRPId(rp.id)
                                                    setModal('reschedule')
                                                }}
                                                className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                Kalanı Taksitlendir
                                            </button>
                                        ) : null}
                                        <button
                                            onClick={() => {
                                                setSelectedRPId(rp.id)
                                                setModal('note')
                                            }}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-all"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            Not
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedRPId(rp.id)
                                                setModal('editRP')
                                            }}
                                            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[var(--bg-elevated)] transition-colors"
                                            aria-label={`${rp.description} kaydını düzenle`}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRP(rp.id)}
                                            className="p-2 rounded-xl text-zinc-500 hover:text-[color:var(--accent-danger)] hover:bg-red-500/10 transition-colors"
                                            aria-label={`${rp.description} kaydını sil`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {rp.transactions.length > 0 ? (
                                    <div className="border-t border-[var(--border-subtle)] pt-3 mt-3">
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 mb-2">Hareket Geçmişi</p>
                                        <div className="space-y-2">
                                            {rp.transactions.map((transaction) => (
                                                <div key={transaction.id} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-zinc-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span className="privacy-blur">{new Date(transaction.transactionDate).toLocaleDateString('tr-TR')}</span>
                                                        {transaction.description ? <span>- {transaction.description}</span> : null}
                                                        {transaction.account ? <span className="text-zinc-600">({transaction.account.name})</span> : null}
                                                    </div>
                                                    <span className="font-semibold text-white privacy-blur">{formatCurrency(transaction.amount, rp.currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                {rp.installments.length > 0 ? (
                                    <div className="border-t border-[var(--border-default)] pt-4 mt-4">
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 mb-3">Taksit Planı</p>
                                        <div className="data-table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>No</th>
                                                        <th>Vade</th>
                                                        <th>Planlanan</th>
                                                        <th>Ödenen</th>
                                                        <th>Kalan</th>
                                                        <th>Durum</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rp.installments.map((installment) => (
                                                        <tr key={installment.id}>
                                                            <td>{installment.installmentNo}</td>
                                                            <td>{new Date(installment.dueDate).toLocaleDateString('tr-TR')}</td>
                                                            <td className="font-mono privacy-blur">{formatCurrency(installment.plannedAmount, rp.currency)}</td>
                                                            <td className="font-mono privacy-blur">{formatCurrency(installment.paidAmount, rp.currency)}</td>
                                                            <td className="font-mono privacy-blur">{formatCurrency(installment.remainingAmount, rp.currency)}</td>
                                                            <td>
                                                                <span className={cn(
                                                                    'status-badge',
                                                                    installment.status === 'PAID' && 'status-badge-success',
                                                                    installment.status === 'PARTIAL_PAID' && 'status-badge-warning',
                                                                    installment.status === 'OVERDUE' && 'status-badge-danger',
                                                                    !['PAID', 'PARTIAL_PAID', 'OVERDUE'].includes(installment.status) && 'status-badge-neutral',
                                                                )}>
                                                                    {installment.status === 'PENDING' ? 'Bekliyor' :
                                                                        installment.status === 'PARTIAL_PAID' ? 'Kısmi ödendi' :
                                                                            installment.status === 'PAID' ? 'Ödendi' :
                                                                                installment.status === 'OVERDUE' ? `Gecikti (${installment.delayDays} gün)` :
                                                                                    installment.status === 'RESCHEDULED' ? 'Yeniden yapılandırıldı' :
                                                                                        installment.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : null}

                                {rp.events.length > 0 ? (
                                    <div className="border-t border-[var(--border-default)] pt-4 mt-4">
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 mb-3">Timeline</p>
                                        <div className="space-y-2">
                                            {rp.events.slice(0, 6).map((event) => (
                                                <div key={event.id} className="flex items-start justify-between gap-4 text-sm">
                                                    <p style={{ color: 'var(--text-secondary)' }}>{event.eventText}</p>
                                                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{new Date(event.createdAt).toLocaleString('tr-TR')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
            )}

            {modal === 'editPerson' ? (
                <Modal title="Kişiyi Düzenle" onClose={() => setModal('closed')}>
                    <form action={updatePersonActionState} className="space-y-4">
                        <input type="hidden" name="personId" value={person.id} />
                        <input name="name" defaultValue={person.name} placeholder="Ad Soyad" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="phone" defaultValue={person.phone ?? ''} placeholder="Telefon (opsiyonel)" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                            <input name="email" type="email" defaultValue={person.email ?? ''} placeholder="E-posta (opsiyonel)" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        </div>
                        <textarea name="notes" defaultValue={person.notes ?? ''} placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={updatePersonState.success} message={updatePersonState.message} />
                        <SubmitButton label="Kişiyi Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </Modal>
            ) : null}

            {modal === 'addRP' ? (
                <Modal title="Alacak / Verecek Ekle" onClose={() => setModal('closed')}>
                    <form action={createRPActionState} className="space-y-4">
                        <input type="hidden" name="personId" value={person.id} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <select name="type" className="form-input">
                                <option value="RECEIVABLE">Bana borcu var / Alacak</option>
                                <option value="PAYABLE">Ben borçluyum / Verecek</option>
                            </select>
                            <select name="riskLevel" defaultValue="MEDIUM" className="form-input">
                                <option value="LOW">Düşük risk</option>
                                <option value="MEDIUM">Orta risk</option>
                                <option value="HIGH">Yüksek risk</option>
                            </select>
                        </div>
                        <input name="title" placeholder="Başlık" className="form-input" required />
                        <input name="description" placeholder="Açıklama" className="form-input" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="amount" type="number" step="0.01" min="0.01" placeholder="Ana tutar" className="form-input" required />
                            <input name="totalAmount" type="number" step="0.01" min="0.01" placeholder="Toplam alınacak/ödenecek" className="form-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <select name="currency" className="form-input">
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                            <input name="category" placeholder="Kategori" className="form-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input name="startDate" type="date" className="form-input" />
                            <input name="dueDate" type="date" className="form-input" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select name="paymentPlanType" defaultValue="ONE_TIME" className="form-input">
                                <option value="ONE_TIME">Tek seferlik</option>
                                <option value="INSTALLMENT">Taksitli</option>
                                <option value="FLEXIBLE">Serbest / düzensiz ödeme</option>
                            </select>
                            <input name="installmentCount" type="number" min="1" placeholder="Taksit sayısı" className="form-input" />
                            <select name="installmentPeriod" defaultValue="MONTHLY" className="form-input">
                                <option value="DAILY">Günlük</option>
                                <option value="WEEKLY">Haftalık</option>
                                <option value="BIWEEKLY">15 günlük</option>
                                <option value="MONTHLY">Aylık</option>
                            </select>
                        </div>
                        <input name="firstInstallmentDate" type="date" className="form-input" />
                        <div className="rounded-2xl p-4" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-hover)' }}>
                            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <input name="reminderEnabled" type="checkbox" />
                                Hatırlatma aktif
                            </label>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <label><input name="reminder_DUE_DAY" type="checkbox" defaultChecked /> Vade günü</label>
                                <label><input name="reminder_ONE_DAY_BEFORE" type="checkbox" /> 1 gün önce</label>
                                <label><input name="reminder_THREE_DAYS_BEFORE" type="checkbox" /> 3 gün önce</label>
                                <label><input name="reminder_ONE_WEEK_BEFORE" type="checkbox" /> 1 hafta önce</label>
                            </div>
                        </div>
                        <textarea name="notes" placeholder="Genel açıklama" className="form-input min-h-20" />
                        <textarea name="internalNote" placeholder="İç not" className="form-input min-h-20" />
                        <FormMessage success={createRPState.success} message={createRPState.message} />
                        <SubmitButton label="Kaydı Kaydet" pendingLabel="Kaydediliyor..." />
                    </form>
                </Modal>
            ) : null}

            {modal === 'editRP' && selectedRP ? (
                <Modal title="Kaydı Düzenle" onClose={() => setModal('closed')}>
                    <form action={updateRPActionState} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <select name="type" defaultValue={selectedRP.type} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                            <option value="RECEIVABLE">Bana borçlu (Alacak)</option>
                            <option value="PAYABLE">Benim borcum (Verecek)</option>
                        </select>
                        <input name="description" defaultValue={selectedRP.description} placeholder="Açıklama" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="originalAmount" type="number" step="0.01" min="0.01" defaultValue={selectedRP.originalAmount} placeholder="Toplam tutar" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                            <input name="remainingAmount" type="number" step="0.01" min="0" defaultValue={selectedRP.remainingAmount} placeholder="Kalan tutar" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <select name="currency" defaultValue={selectedRP.currency} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white">
                            <option value="TRY">TRY</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                        <input name="dueDate" type="date" defaultValue={selectedRP.dueDate ? selectedRP.dueDate.slice(0, 10) : ''} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        <textarea name="notes" placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={updateRPState.success} message={updateRPState.message} />
                        <SubmitButton label="Kaydı Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </Modal>
            ) : null}

            {modal === 'collect' && selectedRP ? (
                <Modal title={`Tahsilat: ${selectedRP.description}`} onClose={() => setModal('closed')}>
                    <form action={collectionActionState} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <div className="fintech-card p-4 mb-2">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kalan alacak</p>
                            <p className="text-xl font-bold text-[color:var(--accent-success)]">{formatCurrency(selectedRP.remainingAmount, selectedRP.currency)}</p>
                        </div>
                        {selectedRP.installments.length > 0 ? (
                            <div>
                                <label className="form-label">Taksit</label>
                                <select name="installmentId" className="form-input">
                                    <option value="">En eski açık taksite uygula</option>
                                    {selectedRP.installments.filter((item) => item.remainingAmount > 0).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.installmentNo}. taksit - {new Date(item.dueDate).toLocaleDateString('tr-TR')} - kalan {formatCurrency(item.remainingAmount, selectedRP.currency)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                        <input name="amount" type="number" step="0.01" min="0.01" max={selectedRP.remainingAmount} placeholder="Tahsilat tutarı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        <AccountSelect accounts={accounts} name="accountId" label="Paranın yatacağı hesap" required />
                        <input name="description" placeholder="Açıklama (opsiyonel)" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={collectionState.success} message={collectionState.message} />
                        <SubmitButton label="Tahsilatı Kaydet" pendingLabel="Kaydediliyor..." className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all disabled:opacity-60" />
                    </form>
                </Modal>
            ) : null}

            {modal === 'pay' && selectedRP ? (
                <Modal title={`Ödeme: ${selectedRP.description}`} onClose={() => setModal('closed')}>
                    <form action={paymentActionState} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <div className="fintech-card p-4 mb-2">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kalan borç</p>
                            <p className="text-xl font-bold text-[color:var(--accent-danger)]">{formatCurrency(selectedRP.remainingAmount, selectedRP.currency)}</p>
                        </div>
                        {selectedRP.installments.length > 0 ? (
                            <div>
                                <label className="form-label">Taksit</label>
                                <select name="installmentId" className="form-input">
                                    <option value="">En eski açık taksite uygula</option>
                                    {selectedRP.installments.filter((item) => item.remainingAmount > 0).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.installmentNo}. taksit - {new Date(item.dueDate).toLocaleDateString('tr-TR')} - kalan {formatCurrency(item.remainingAmount, selectedRP.currency)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}
                        <input name="amount" type="number" step="0.01" min="0.01" max={selectedRP.remainingAmount} placeholder="Ödeme tutarı" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        <AccountSelect accounts={accounts} name="accountId" label="Paranın çıkacağı hesap" required />
                        <input name="description" placeholder="Açıklama (opsiyonel)" className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={paymentState.success} message={paymentState.message} />
                        <SubmitButton label="Ödemeyi Kaydet" pendingLabel="Kaydediliyor..." className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl hover:bg-red-400 transition-all disabled:opacity-60" />
                    </form>
                </Modal>
            ) : null}

            {modal === 'reschedule' && selectedRP ? (
                <Modal title="Kalanı Yeniden Taksitlendir" onClose={() => setModal('closed')}>
                    <form action={rescheduleActionState} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <div className="fintech-card p-4">
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Yeniden yapılandırılacak kalan tutar</p>
                            <p className="text-xl font-bold privacy-blur" style={{ color: selectedRP.type === 'RECEIVABLE' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                                {formatCurrency(selectedRP.remainingAmount, selectedRP.currency)}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label">Taksit sayısı</label>
                                <input name="installmentCount" type="number" min="1" defaultValue="4" className="form-input" required />
                            </div>
                            <div>
                                <label className="form-label">İlk taksit tarihi</label>
                                <input name="firstInstallmentDate" type="date" className="form-input" required />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Taksit periyodu</label>
                            <select name="installmentPeriod" defaultValue="MONTHLY" className="form-input">
                                <option value="DAILY">Günlük</option>
                                <option value="WEEKLY">Haftalık</option>
                                <option value="BIWEEKLY">15 günlük</option>
                                <option value="MONTHLY">Aylık</option>
                            </select>
                        </div>
                        <textarea name="note" placeholder="Yeniden yapılandırma notu" className="form-input min-h-20" />
                        <FormMessage success={rescheduleState.success} message={rescheduleState.message} />
                        <SubmitButton label="Kalanı Taksitlendir" pendingLabel="Plan oluşturuluyor..." />
                    </form>
                </Modal>
            ) : null}

            {modal === 'note' && selectedRP ? (
                <Modal title="Not Ekle" onClose={() => setModal('closed')}>
                    <form action={noteActionState} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <div>
                            <label className="form-label">Not türü</label>
                            <select name="noteType" defaultValue="GENERAL" className="form-input">
                                <option value="GENERAL">Genel not</option>
                                <option value="PAYMENT">Ödeme notu</option>
                                <option value="DELAY">Gecikme notu</option>
                                <option value="RESCHEDULE">Yeniden taksitlendirme notu</option>
                                <option value="PERSON_INTERNAL">Kişiye özel iç not</option>
                            </select>
                        </div>
                        <textarea name="note" placeholder="Not içeriği" className="form-input min-h-28" required />
                        <FormMessage success={noteState.success} message={noteState.message} />
                        <SubmitButton label="Notu Kaydet" pendingLabel="Kaydediliyor..." />
                    </form>
                </Modal>
            ) : null}
        </div>
    )
}
