'use client'

import { useState } from 'react'
import { Plus, ArrowDownLeft, ArrowUpRight, CalendarDays, Clock } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import AccountSelect from '@/components/accounts/AccountSelect'
import { createRPAction, recordCollectionAction, recordPaymentToPersonAction } from '@/app/people/actions'
import type { Account } from '@prisma/client'

type ModalState = 'closed' | 'addRP' | 'collect' | 'pay'

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
    OPEN: { text: 'Açık', color: 'text-sky-400 bg-sky-500/10' },
    PARTIAL: { text: 'Kısmi', color: 'text-amber-400 bg-amber-500/10' },
    CLOSED: { text: 'Kapandı', color: 'text-emerald-400 bg-emerald-500/10' },
    OVERDUE: { text: 'Gecikmiş', color: 'text-red-400 bg-red-500/10' },
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
            description: string
            originalAmount: number
            remainingAmount: number
            currency: string
            dueDate: string | null
            status: string
            createdAt: string
            transactions: Array<{
                id: string
                amount: number
                transactionDate: string
                description: string | null
                account: { name: string } | null
            }>
        }>
    }
    accounts: Account[]
}

export default function PersonDetailWorkspace({ person, accounts }: Props) {
    const [modal, setModal] = useState<ModalState>('closed')
    const [selectedRPId, setSelectedRPId] = useState<string | null>(null)

    const receivables = person.receivablesPayables.filter((rp) => rp.type === 'RECEIVABLE')
    const payables = person.receivablesPayables.filter((rp) => rp.type === 'PAYABLE')
    const totalReceivable = receivables.filter((r) => r.status !== 'CLOSED').reduce((s, r) => s + r.remainingAmount, 0)
    const totalPayable = payables.filter((r) => r.status !== 'CLOSED').reduce((s, r) => s + r.remainingAmount, 0)

    const selectedRP = person.receivablesPayables.find((rp) => rp.id === selectedRPId)

    return (
        <div>
            {/* Kişi Bilgi + Özet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Alacak</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalReceivable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Verecek</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalPayable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Net Durum</p>
                    <p className={cn('text-2xl font-bold', totalReceivable - totalPayable >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(totalReceivable - totalPayable, 'TRY')}
                    </p>
                </div>
            </div>

            {/* Kişi Detay */}
            {(person.phone || person.email || person.notes) && (
                <div className="fintech-card p-5 mb-6 text-sm text-zinc-400 flex flex-wrap gap-6">
                    {person.phone && <span>📞 {person.phone}</span>}
                    {person.email && <span>✉️ {person.email}</span>}
                    {person.notes && <span>📝 {person.notes}</span>}
                </div>
            )}

            {/* Aksiyon */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => setModal('addRP')} className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all">
                    <Plus className="w-4 h-4" /> Alacak / Verecek Ekle
                </button>
            </div>

            {/* Kayıtlar */}
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
                                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <ArrowUpRight className="w-4 h-4 text-red-400" />
                                            )}
                                            <h3 className="font-semibold text-white">{rp.description}</h3>
                                            <span className={cn('text-[10px] uppercase tracking-[0.25em] px-2 py-0.5 rounded-lg', statusMeta.color)}>
                                                {statusMeta.text}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1">
                                            <span>{isReceivable ? 'Alacak' : 'Verecek'}</span>
                                            {rp.dueDate && (
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    {new Date(rp.dueDate).toLocaleDateString('tr-TR')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-zinc-500">Kalan</p>
                                            <p className={cn('text-xl font-bold', isReceivable ? 'text-emerald-400' : 'text-red-400')}>
                                                {formatCurrency(rp.remainingAmount, rp.currency)}
                                            </p>
                                            <p className="text-xs text-zinc-600">/ {formatCurrency(rp.originalAmount, rp.currency)}</p>
                                        </div>
                                        {rp.status !== 'CLOSED' && (
                                            <button
                                                onClick={() => { setSelectedRPId(rp.id); setModal(isReceivable ? 'collect' : 'pay') }}
                                                className={cn(
                                                    'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                                                    isReceivable ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                )}
                                            >
                                                {isReceivable ? 'Tahsilat Gir' : 'Ödeme Yap'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Hareket Geçmişi */}
                                {rp.transactions.length > 0 && (
                                    <div className="border-t border-white/5 pt-3 mt-3">
                                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-600 mb-2">Hareket Geçmişi</p>
                                        <div className="space-y-2">
                                            {rp.transactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 text-zinc-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{new Date(tx.transactionDate).toLocaleDateString('tr-TR')}</span>
                                                        {tx.description && <span>— {tx.description}</span>}
                                                        {tx.account && <span className="text-zinc-600">({tx.account.name})</span>}
                                                    </div>
                                                    <span className="font-semibold text-white">{formatCurrency(tx.amount, rp.currency)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Alacak/Verecek Ekleme Modalı */}
            {modal === 'addRP' && (
                <Modal title="Alacak / Verecek Ekle" onClose={() => setModal('closed')}>
                    <form action={createRPAction} className="space-y-4">
                        <input type="hidden" name="personId" value={person.id} />
                        <select name="type" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white">
                            <option value="RECEIVABLE">Bana borçlu (Alacak)</option>
                            <option value="PAYABLE">Benim borcum (Verecek)</option>
                        </select>
                        <input name="description" placeholder="Açıklama (ev kirası, ödünç, vb.)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="amount" type="number" step="0.01" min="0.01" placeholder="Tutar" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                            <select name="currency" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white">
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        <input name="dueDate" type="date" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <textarea name="notes" placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <button type="submit" onClick={() => setModal('closed')} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all">
                            Kaydet
                        </button>
                    </form>
                </Modal>
            )}

            {/* Tahsilat Modalı */}
            {modal === 'collect' && selectedRP && (
                <Modal title={`Tahsilat: ${selectedRP.description}`} onClose={() => setModal('closed')}>
                    <form action={recordCollectionAction} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <div className="fintech-card p-4 mb-2">
                            <p className="text-xs text-zinc-500">Kalan alacak</p>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(selectedRP.remainingAmount, selectedRP.currency)}</p>
                        </div>
                        <input name="amount" type="number" step="0.01" min="0.01" max={selectedRP.remainingAmount} placeholder="Tahsilat tutarı" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        <AccountSelect accounts={accounts} name="accountId" label="Paranın yatacağı hesap" required />
                        <input name="description" placeholder="Açıklama (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <button type="submit" onClick={() => setModal('closed')} className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl hover:bg-emerald-400 transition-all">
                            Tahsilatı Kaydet
                        </button>
                    </form>
                </Modal>
            )}

            {/* Ödeme Modalı */}
            {modal === 'pay' && selectedRP && (
                <Modal title={`Ödeme: ${selectedRP.description}`} onClose={() => setModal('closed')}>
                    <form action={recordPaymentToPersonAction} className="space-y-4">
                        <input type="hidden" name="rpId" value={selectedRP.id} />
                        <div className="fintech-card p-4 mb-2">
                            <p className="text-xs text-zinc-500">Kalan borç</p>
                            <p className="text-xl font-bold text-red-400">{formatCurrency(selectedRP.remainingAmount, selectedRP.currency)}</p>
                        </div>
                        <input name="amount" type="number" step="0.01" min="0.01" max={selectedRP.remainingAmount} placeholder="Ödeme tutarı" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        <AccountSelect accounts={accounts} name="accountId" label="Paranın çıkacağı hesap" required />
                        <input name="description" placeholder="Açıklama (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <button type="submit" onClick={() => setModal('closed')} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl hover:bg-red-400 transition-all">
                            Ödemeyi Kaydet
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}
