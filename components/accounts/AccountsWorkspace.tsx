'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Plus, ArrowLeftRight } from 'lucide-react'
import type { Account } from '@prisma/client'

import {
    createAccountActionState,
    updateAccountAction,
    deleteAccountAction,
    adjustBalanceAction,
    transferAction,
} from '@/app/accounts/actions'
import AccountCard from './AccountCard'
import AccountSelect from './AccountSelect'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { cn, formatCurrency } from '@/lib/utils'

type ModalState = 'closed' | 'add' | 'edit' | 'adjust' | 'transfer'

interface Props {
    initialAccounts: Account[]
    totalBalance: number
    availableCash: number
}

export default function AccountsWorkspace({ initialAccounts, totalBalance, availableCash }: Props) {
    const [modal, setModal] = useState<ModalState>('closed')
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(createAccountActionState, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updateAccountAction, EMPTY_ACTION_RESULT)
    const [adjustState, adjustAction] = useActionState(adjustBalanceAction, EMPTY_ACTION_RESULT)
    const [transferState, transferFormAction] = useActionState(transferAction, EMPTY_ACTION_RESULT)

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

    function handleDelete(accountId: string) {
        if (!confirm('Bu hesabi silmek istediginizden emin misiniz?')) return
        startDeleteTransition(async () => {
            const result = await deleteAccountAction(accountId)
            setFeedback(result)
        })
    }

    useEffect(() => {
        if (!createState.success || modal !== 'add') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, modal])

    useEffect(() => {
        if (!updateState.success || modal !== 'edit') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedAccount(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, modal])

    useEffect(() => {
        if (!adjustState.success || modal !== 'adjust') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedAccount(null)
            setFeedback(adjustState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [adjustState, modal])

    useEffect(() => {
        if (!transferState.success || modal !== 'transfer') return

        const timeoutId = window.setTimeout(() => {
            setModal('closed')
            setSelectedAccount(null)
            setFeedback(transferState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [transferState, modal])

    const activeFormState =
        modal === 'add'
            ? createState
            : modal === 'edit'
                ? updateState
                : modal === 'adjust'
                    ? adjustState
                    : transferState

    return (
        <div>
            <FormMessage success={feedback?.success} message={feedback?.message} />

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

            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={() => {
                        setSelectedAccount(null)
                        setModal('add')
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <Plus className="w-4 h-4" /> Hesap Ekle
                </button>
                {initialAccounts.length >= 2 && (
                    <button
                        onClick={() => {
                            setSelectedAccount(null)
                            setModal('transfer')
                        }}
                        className="flex items-center gap-2 px-5 py-3 border border-white/10 text-zinc-300 rounded-2xl hover:bg-white/5 transition-all"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Transfer Yap
                    </button>
                )}
            </div>

            {initialAccounts.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    Henüz hesap eklenmedi. Banka hesabi, nakit veya cüzdan ekleyerek başlayin.
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

            {(modal === 'add' || modal === 'edit') && (
                <Modal title={modal === 'add' ? 'Yeni Hesap Ekle' : 'Hesabi Düzenle'} onClose={() => setModal('closed')}>
                    <form action={modal === 'add' ? createAction : updateAction} className="space-y-4">
                        {modal === 'edit' && selectedAccount ? (
                            <input type="hidden" name="accountId" value={selectedAccount.id} />
                        ) : null}
                        <input
                            name="name"
                            placeholder="Hesap adi (Ziraat Vadesiz, Nakit Cuzdan)"
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
                                <option value="BANK_ACCOUNT">Banka Hesabi</option>
                                <option value="CASH">Nakit</option>
                                <option value="WALLET">Cuzdan</option>
                                <option value="INVESTMENT">Yatirim</option>
                                <option value="OTHER_ACCOUNT">Diger</option>
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
                        {modal === 'add' ? (
                            <input
                                name="balance"
                                type="number"
                                step="0.01"
                                placeholder="Baslangic bakiyesi"
                                className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                            />
                        ) : null}
                        <input
                            name="bankName"
                            placeholder="Banka adi (opsiyonel)"
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
                            Varsayilan hesap
                        </label>
                        <FormMessage success={activeFormState.success} message={activeFormState.message} />
                        <SubmitButton label={modal === 'add' ? 'Hesabi Kaydet' : 'Guncelle'} pendingLabel={modal === 'add' ? 'Kaydediliyor...' : 'Guncelleniyor...'} />
                    </form>
                </Modal>
            )}

            {modal === 'adjust' && selectedAccount ? (
                <Modal title={`${selectedAccount.name} — Bakiye Duzelt`} onClose={() => setModal('closed')}>
                    <form action={adjustAction} className="space-y-4">
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
                            placeholder="Aciklama (opsiyonel)"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <FormMessage success={adjustState.success} message={adjustState.message} />
                        <SubmitButton label="Bakiyeyi Guncelle" pendingLabel="Guncelleniyor..." />
                    </form>
                </Modal>
            ) : null}

            {modal === 'transfer' ? (
                <Modal title="Hesaplar Arasi Transfer" onClose={() => setModal('closed')}>
                    <form action={transferFormAction} className="space-y-4">
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
                            placeholder="Aciklama (opsiyonel)"
                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                        />
                        <FormMessage success={transferState.success} message={transferState.message} />
                        <SubmitButton label="Transferi Gerceklestir" pendingLabel="Kaydediliyor..." />
                    </form>
                </Modal>
            ) : null}
        </div>
    )
}
