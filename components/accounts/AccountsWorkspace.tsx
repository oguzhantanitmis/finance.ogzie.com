'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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

    // Hızlı işlem derin bağlantısı: /accounts?new=1 → hesap ekleme modalını aç
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    useEffect(() => {
        if (!searchParams.get('new')) return
        setModal('add')
        router.replace(pathname, { scroll: false })
    }, [searchParams, router, pathname])

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
                    <p className={cn('text-2xl font-bold privacy-blur', totalBalance < 0 ? 'text-[color:var(--accent-danger)]' : 'text-white')}>
                        {formatCurrency(totalBalance, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Kullanılabilir Nakit</p>
                    <p className={cn('text-2xl font-bold privacy-blur', availableCash < 0 ? 'text-[color:var(--accent-danger)]' : 'text-[color:var(--accent-success)]')}>
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
                        className="flex items-center gap-2 px-5 py-3 border border-[var(--border-default)] text-zinc-300 rounded-2xl hover:bg-[var(--bg-hover)] transition-all"
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
                    <AccountForm
                        account={modal === 'edit' ? selectedAccount : null}
                        mode={modal}
                        action={modal === 'add' ? createAction : updateAction}
                        state={activeFormState}
                    />
                </Modal>
            )}

            {modal === 'adjust' && selectedAccount ? (
                <Modal title={`${selectedAccount.name} — Bakiye Duzelt`} onClose={() => setModal('closed')}>
                    <form action={adjustAction} className="space-y-4">
                        <input type="hidden" name="accountId" value={selectedAccount.id} />
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Mevcut bakiye</p>
                            <p className="text-xl font-bold text-white mb-4 privacy-blur">
                                {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                            </p>
                        </div>
                        <input
                            name="newBalance"
                            type="number"
                            step="0.01"
                            placeholder="Yeni bakiye"
                            className="form-input"
                            required
                        />
                        <input
                            name="description"
                            placeholder="Aciklama (opsiyonel)"
                            className="form-input"
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
                            className="form-input"
                            required
                        />
                        <input
                            name="description"
                            placeholder="Aciklama (opsiyonel)"
                            className="form-input"
                        />
                        <FormMessage success={transferState.success} message={transferState.message} />
                        <SubmitButton label="Transferi Gerceklestir" pendingLabel="Kaydediliyor..." />
                    </form>
                </Modal>
            ) : null}
        </div>
    )
}

function AccountForm({
    account,
    mode,
    action,
    state,
}: {
    account: Account | null
    mode: 'add' | 'edit'
    action: (payload: FormData) => void
    state: ActionResult
}) {
    const [accountType, setAccountType] = useState(account?.type ?? 'BANK_ACCOUNT')
    const [hasKmh, setHasKmh] = useState(account?.hasKmh ?? false)
    const showKmhFields = accountType === 'BANK_ACCOUNT' && hasKmh

    return (
        <form action={action} className="space-y-4">
            {mode === 'edit' && account ? <input type="hidden" name="accountId" value={account.id} /> : null}
            <input
                name="name"
                placeholder="Hesap adi (Ziraat Vadesiz, Nakit Cuzdan)"
                defaultValue={account?.name ?? ''}
                className="form-input"
                required
            />
            <div className="grid grid-cols-2 gap-4">
                <select
                    name="type"
                    defaultValue={account?.type ?? 'BANK_ACCOUNT'}
                    onChange={(event) => setAccountType(event.target.value as Account['type'])}
                    className="form-input form-select"
                >
                    <option value="BANK_ACCOUNT">Banka Hesabi</option>
                    <option value="CASH">Nakit</option>
                    <option value="WALLET">Cuzdan</option>
                    <option value="INVESTMENT">Yatirim</option>
                    <option value="OTHER_ACCOUNT">Diger</option>
                </select>
                <select
                    name="currency"
                    defaultValue={account?.currency ?? 'TRY'}
                    className="form-input form-select"
                >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                </select>
            </div>
            {mode === 'add' ? (
                <input
                    name="balance"
                    type="number"
                    step="0.01"
                    placeholder="Baslangic bakiyesi"
                    className="form-input"
                />
            ) : null}
            <input
                name="bankName"
                placeholder="Banka adi (opsiyonel)"
                defaultValue={account?.bankName ?? ''}
                className="form-input"
            />
            <input
                name="iban"
                placeholder="IBAN (opsiyonel)"
                defaultValue={account?.iban ?? ''}
                className="form-input"
            />

            {accountType === 'BANK_ACCOUNT' ? (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4 space-y-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                            name="hasKmh"
                            type="checkbox"
                            defaultChecked={account?.hasKmh ?? false}
                            onChange={(event) => setHasKmh(event.target.checked)}
                            className="rounded border-white/20 bg-black"
                        />
                        Bu hesapta KMH / Avans Hesap var
                    </label>

                    {showKmhFields ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AccountField
                                    label="KMH limiti"
                                    name="kmhLimit"
                                    type="number"
                                    step="0.01"
                                    defaultValue={account?.kmhLimit ?? ''}
                                />
                                <AccountField
                                    label="Aylık akdi faiz (%)"
                                    name="kmhInterestRate"
                                    type="number"
                                    step="0.01"
                                    defaultValue={account?.kmhInterestRate ?? 4.25}
                                />
                            </div>
                            <AccountField
                                label="Aylık gecikme faizi (%)"
                                name="kmhLateInterestRate"
                                type="number"
                                step="0.01"
                                defaultValue={account?.kmhLateInterestRate ?? 4.55}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AccountField
                                    label="Hesap kesim günü"
                                    name="kmhCutOffDay"
                                    type="number"
                                    min="1"
                                    max="31"
                                    defaultValue={account?.kmhCutOffDay ?? ''}
                                />
                                <AccountField
                                    label="Son ödeme günü"
                                    name="kmhPaymentDueDay"
                                    type="number"
                                    min="1"
                                    max="31"
                                    defaultValue={account?.kmhPaymentDueDay ?? ''}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <AccountField
                                    label="Hesap kesim tarihi"
                                    name="kmhStatementDate"
                                    type="date"
                                    defaultValue={formatAccountDateInput(account?.kmhStatementDate)}
                                />
                                <AccountField
                                    label="Son ödeme tarihi"
                                    name="kmhNextPaymentDate"
                                    type="date"
                                    defaultValue={formatAccountDateInput(account?.kmhNextPaymentDate)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <AccountField
                                    label="Anapara borcu"
                                    name="kmhStatementPrincipal"
                                    type="number"
                                    step="0.01"
                                    defaultValue={account?.kmhStatementPrincipal ?? ''}
                                />
                                <AccountField
                                    label="Dönem faizi + vergi"
                                    name="kmhStatementInterest"
                                    type="number"
                                    step="0.01"
                                    defaultValue={account?.kmhStatementInterest ?? ''}
                                />
                                <AccountField
                                    label="Asgari ödeme"
                                    name="kmhMinimumPayment"
                                    type="number"
                                    step="0.01"
                                    defaultValue={account?.kmhMinimumPayment ?? ''}
                                />
                            </div>
                            <AccountField
                                label="Sonraki hesap kesim tarihi"
                                name="kmhNextCutOffDate"
                                type="date"
                                defaultValue={formatAccountDateInput(account?.kmhNextCutOffDate)}
                            />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Dönem borcu, anapara borcu ile dönem faizi + vergi toplamından oluşur.
                            </p>
                        </>
                    ) : null}
                </div>
            ) : null}

            <textarea
                name="notes"
                placeholder="Not (opsiyonel)"
                defaultValue={account?.notes ?? ''}
                className="form-input min-h-20"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                    name="isDefault"
                    type="checkbox"
                    defaultChecked={account?.isDefault ?? false}
                    className="rounded border-white/20 bg-black"
                />
                Varsayilan hesap
            </label>
            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={mode === 'add' ? 'Hesabi Kaydet' : 'Guncelle'} pendingLabel={mode === 'add' ? 'Kaydediliyor...' : 'Guncelleniyor...'} />
        </form>
    )
}

function formatAccountDateInput(value?: Date | string | null) {
    if (!value) return ''
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
}

function AccountField({
    label,
    name,
    type,
    defaultValue,
    step,
    min,
    max,
}: {
    label: string
    name: string
    type: 'number' | 'date'
    defaultValue?: string | number | null
    step?: string
    min?: string | number
    max?: string | number
}) {
    return (
        <label className="block">
            <span className="form-label">{label}</span>
            <input
                name={name}
                type={type}
                step={step}
                min={min}
                max={max}
                defaultValue={defaultValue ?? ''}
                className="form-input"
            />
        </label>
    )
}
