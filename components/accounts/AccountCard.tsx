'use client'

import { useState } from 'react'
import { Building2, Wallet, TrendingUp, Banknote, MoreHorizontal, Pencil, Trash2, ArrowLeftRight, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@prisma/client'

const ACCOUNT_TYPE_META: Record<string, { label: string; icon: typeof Building2 }> = {
    BANK_ACCOUNT: { label: 'Banka Hesabı', icon: Building2 },
    CASH: { label: 'Nakit', icon: Banknote },
    WALLET: { label: 'Cüzdan', icon: Wallet },
    INVESTMENT: { label: 'Yatırım', icon: TrendingUp },
    OTHER_ACCOUNT: { label: 'Diğer', icon: MoreHorizontal },
}

interface AccountCardProps {
    account: Account
    onEdit: (account: Account) => void
    onDelete: (accountId: string) => void
    onAdjust: (account: Account) => void
    onTransfer: (account: Account) => void
}

export default function AccountCard({ account, onEdit, onDelete, onAdjust, onTransfer }: AccountCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const meta = ACCOUNT_TYPE_META[account.type] ?? ACCOUNT_TYPE_META.OTHER_ACCOUNT
    const Icon = meta.icon
    const isNegative = account.balance < 0
    const kmhUsage = account.hasKmh ? Math.max(account.balance * -1, 0) : 0
    const kmhPrincipal = account.kmhStatementPrincipal ?? kmhUsage
    const kmhInterest = account.kmhStatementInterest ?? 0
    const kmhPeriodDebt = kmhPrincipal + kmhInterest

    return (
        <div className={cn(
            'fintech-card p-5 md:p-6 relative group',
            account.isDefault && 'border-emerald-500/30'
        )}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center',
                        account.isDefault ? 'bg-emerald-500/20 text-[color:var(--accent-success)]' : 'bg-[var(--bg-elevated)] text-zinc-400'
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{account.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{meta.label}{account.bankName ? ` • ${account.bankName}` : ''}</p>
                        {account.hasKmh ? (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 px-2 py-1 rounded-lg bg-amber-500/10">
                                    KMH Açık
                                </span>
                                {account.kmhLimit ? (
                                    <span className="text-[10px] text-zinc-500 privacy-blur">
                                        Limit {formatCurrency(account.kmhLimit, account.currency)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-[var(--bg-elevated)] transition-all opacity-0 group-hover:opacity-100"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl border border-[var(--border-default)] bg-[#141414] shadow-xl py-1">
                                <button onClick={() => { onEdit(account); setShowMenu(false) }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-[var(--bg-hover)] w-full">
                                    <Pencil className="w-3.5 h-3.5" /> Düzenle
                                </button>
                                <button onClick={() => { onAdjust(account); setShowMenu(false) }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-[var(--bg-hover)] w-full">
                                    <Settings className="w-3.5 h-3.5" /> Bakiye Düzelt
                                </button>
                                <button onClick={() => { onTransfer(account); setShowMenu(false) }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-[var(--bg-hover)] w-full">
                                    <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                                </button>
                                <hr className="border-[var(--border-default)] my-1" />
                                <button onClick={() => { onDelete(account.id); setShowMenu(false) }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[color:var(--accent-danger)] hover:bg-red-500/10 w-full">
                                    <Trash2 className="w-3.5 h-3.5" /> Sil
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-[0.25em] mb-1">Bakiye</p>
                    <p className={cn('text-2xl font-bold privacy-blur', isNegative ? 'text-[color:var(--accent-danger)]' : 'text-white')}>
                        {formatCurrency(account.balance, account.currency)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {account.isDefault && (
                        <span className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--accent-success)] px-2 py-1 rounded-lg bg-emerald-500/10">
                            Varsayılan
                        </span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 px-2 py-1 rounded-lg bg-[var(--bg-hover)]">
                        {account.currency}
                    </span>
                </div>
            </div>

            {account.iban && (
                <p className="text-xs text-zinc-600 mt-3 font-mono privacy-blur">{account.iban}</p>
            )}

            {account.hasKmh ? (
                <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4">
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">KMH Durumu</p>
                        <p className={cn('text-sm font-semibold', kmhUsage > 0 ? 'text-amber-300' : 'text-[color:var(--accent-success)]')}>
                            {kmhUsage > 0 ? 'Kullanım Var' : 'Kullanım Yok'}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-zinc-500 mb-1">Anapara Borcu</p>
                            <p className={cn('font-semibold privacy-blur', kmhUsage > 0 ? 'text-red-300' : 'text-white')}>
                                {formatCurrency(kmhPrincipal, account.currency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-500 mb-1">Dönem Borcu</p>
                            <p className={cn('font-semibold privacy-blur', kmhPeriodDebt > 0 ? 'text-red-300' : 'text-white')}>
                                {formatCurrency(kmhPeriodDebt, account.currency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-500 mb-1">Asgari Ödeme</p>
                            <p className="font-semibold privacy-blur text-white">
                                {account.kmhMinimumPayment != null ? formatCurrency(account.kmhMinimumPayment, account.currency) : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-500 mb-1">Kesim / Son Ödeme</p>
                            <p className="font-semibold text-white">
                                {account.kmhCutOffDay ? `${account.kmhCutOffDay}. gün` : 'Kesim yok'}
                                {' / '}
                                {account.kmhPaymentDueDay ? `${account.kmhPaymentDueDay}. gün` : 'Son ödeme yok'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
