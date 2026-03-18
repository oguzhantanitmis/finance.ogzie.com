'use client'

import { useState } from 'react'
import { Plus, ArrowLeftRight, Building2, Banknote, Wallet, TrendingUp, MoreHorizontal } from 'lucide-react'
import type { Account } from '@prisma/client'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import AccountCard from './AccountCard'
import AccountSelect from './AccountSelect'
import {
    createAccountAction,
    deleteAccountAction,
    adjustBalanceAction,
    transferAction,
} from '@/app/accounts/actions'

type ModalState = 'closed' | 'add' | 'edit' | 'adjust' | 'transfer'

interface Props {
    initialAccounts: Account[]
    totalBalance: number
    availableCash: number
}

export default function AccountsWorkspace({ initialAccounts, totalBalance, availableCash }: Props) {
    const [modal, setModal] = useState<ModalState>('closed')
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

    function handleEdit(account: Account) {
        setSelectedAccount(account)
        setModal('edit')
    }

    function handleAdjust(account: Account) {
        setSelectedAccount(account)
        setModal('adjust')
    }

    function handleTransfer(account: Account) {
        setSelectedAccount(account)
        setModal('transfer')
    }

    async function handleDelete(accountId: string) {
        if (!confirm('Bu hesabı silmek istediğinizden emin misiniz?')) return
        await deleteAccountAction(accountId)
    }

    return (
        <div>
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Toplam Bakiye</p>
                    <p className={cn('text-2xl font-bold', totalBalance < 0 ? 'text-red-400' : 'text-white')}>
                        {formatCurrency(totalBalance, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Kullanılabilir Nakit</p>
                    <p className={cn('text-2xl font-bold', availableCash < 0 ? 'text-red-400' : 'text-emerald-400')}>
                        {formatCurrency(availableCash, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Hesap Sayısı</p>
                    <p className="text-2xl font-bold text-white">{initialAccounts.length}</p>
                </div>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={() => setModal('add')}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <Plus className="w-4 h-4" /> Hesap Ekle
                </button>
                {initialAccounts.length >= 2 && (
                    <button
                        onClick={() => { setSelectedAccount(null); setModal('transfer') }}
                        className="flex items-center gap-2 px-5 py-3 border border-white/10 text-zinc-300 rounded-2xl hover:bg-white/5 transition-all"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Transfer Yap
                    </button>
                )}
            </div>

            {/* Hesap Listesi */}
            {initialAccounts.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    Henüz hesap eklenmedi. Banka hesabı, nakit veya cüzdan ekleyerek başlayın.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {initialAccounts.map((account) => (
                        <AccountCard
                            key={account.id}
                            account={account}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAdjust={handleAdjust}
                            onTransfer={handleTransfer}
                        />
                    ))}
                </div>
            )}

            {/* Hesap Ekleme / Düzenleme Modalı */}
            {(modal === 'add' || modal === 'edit') && (
                <Modal title={modal === 'add' ? 'Yeni Hesap Ekle' : 'Hesabı Düzenle'} onClose={() => setModal('closed')}>
                    <form action={createAccountAction} className="space-y-4">
                        {modal === 'edit' && selectedAccount && (
                            <input type="hidden" name="accountId" value={selectedAccount.id} />
                        )}
                        <input
                            name="name"
                            placeholder="Hesap adı (Ziraat Vadesiz, Nakit Cüzdan)"
                            defaultValue={selectedAccount?.name ?? ''}
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            required
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <select
                                name="type"
                                defaultValue={selectedAccount?.type ?? 'BANK_ACCOUNT'}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            >
                                <option value="BANK_ACCOUNT">Banka Hesabı</option>
                                <option value="CASH">Nakit</option>
                                <option value="WALLET">Cüzdan</option>
                                <option value="INVESTMENT">Yatırım</option>
                                <option value="OTHER_ACCOUNT">Diğer</option>
                            </select>
                            <select
                                name="currency"
                                defaultValue={selectedAccount?.currency ?? 'TRY'}
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            >
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        {modal === 'add' && (
                            <input
                                name="balance"
                                type="number"
                                step="0.01"
                                placeholder="Başlangıç bakiyesi"
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            />
                        )}
                        <input
                            name="bankName"
                            placeholder="Banka adı (opsiyonel)"
                            defaultValue={selectedAccount?.bankName ?? ''}
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <input
                            name="iban"
                            placeholder="IBAN (opsiyonel)"
                            defaultValue={selectedAccount?.iban ?? ''}
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <textarea
                            name="notes"
                            placeholder="Not (opsiyonel)"
                            defaultValue={selectedAccount?.notes ?? ''}
                            className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <label className="flex items-center gap-2 text-sm text-zinc-400">
                            <input
                                name="isDefault"
                                type="checkbox"
                                defaultChecked={selectedAccount?.isDefault ?? false}
                                className="rounded border-white/20 bg-black"
                            />
                            Varsayılan hesap
                        </label>
                        <button
                            type="submit"
                            onClick={() => setModal('closed')}
                            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                        >
                            {modal === 'add' ? 'Hesabı Kaydet' : 'Güncelle'}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Bakiye Düzeltme Modalı */}
            {modal === 'adjust' && selectedAccount && (
                <Modal title={`${selectedAccount.name} — Bakiye Düzelt`} onClose={() => setModal('closed')}>
                    <form action={adjustBalanceAction} className="space-y-4">
                        <input type="hidden" name="accountId" value={selectedAccount.id} />
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Mevcut bakiye</p>
                            <p className="text-xl font-bold text-white mb-4">
                                {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                            </p>
                        </div>
                        <input
                            name="newBalance"
                            type="number"
                            step="0.01"
                            placeholder="Yeni bakiye"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            required
                        />
                        <input
                            name="description"
                            placeholder="Açıklama (opsiyonel)"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <button
                            type="submit"
                            onClick={() => setModal('closed')}
                            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                        >
                            Bakiyeyi Güncelle
                        </button>
                    </form>
                </Modal>
            )}

            {/* Transfer Modalı */}
            {modal === 'transfer' && (
                <Modal title="Hesaplar Arası Transfer" onClose={() => setModal('closed')}>
                    <form action={transferAction} className="space-y-4">
                        <AccountSelect
                            accounts={initialAccounts}
                            name="fromAccountId"
                            label="Kaynak Hesap"
                            selected={selectedAccount?.id}
                            required
                        />
                        <AccountSelect
                            accounts={initialAccounts}
                            name="toAccountId"
                            label="Hedef Hesap"
                            excludeId={selectedAccount?.id}
                            required
                        />
                        <input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="Tutar"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            required
                        />
                        <input
                            name="description"
                            placeholder="Açıklama (opsiyonel)"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <button
                            type="submit"
                            onClick={() => setModal('closed')}
                            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all"
                        >
                            Transferi Gerçekleştir
                        </button>
                    </form>
                </Modal>
            )}
        </div>
    )
}

// ============================================================
// Modal Bileşeni (iç kullanım)
// ============================================================

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}
