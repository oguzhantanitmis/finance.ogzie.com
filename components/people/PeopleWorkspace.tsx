'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { Plus, ArrowDownLeft, ArrowUpRight, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { createPersonAction, createRPAction, deletePersonAction, updatePersonAction } from '@/app/people/actions'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import type { PersonWithSummary } from '@/lib/people-service'
import { cn, formatCurrency } from '@/lib/utils'

interface Props {
    people: PersonWithSummary[]
    summary: { totalReceivable: number; totalPayable: number; net: number; overdueCount: number }
}

export default function PeopleWorkspace({ people, summary }: Props) {
    const [showAdd, setShowAdd] = useState(false)
    const [showAddRecord, setShowAddRecord] = useState(false)
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null)
    const [editingPerson, setEditingPerson] = useState<PersonWithSummary | null>(null)
    const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all')
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [createState, createAction] = useActionState(createPersonAction, EMPTY_ACTION_RESULT)
    const [createRecordState, createRecordAction] = useActionState(createRPAction, EMPTY_ACTION_RESULT)
    const [updateState, updateAction] = useActionState(updatePersonAction, EMPTY_ACTION_RESULT)

    const filtered = people.filter((person) => {
        if (filter === 'receivable') return person.totalReceivable > 0
        if (filter === 'payable') return person.totalPayable > 0
        return true
    })

    useEffect(() => {
        if (!createState.success || !showAdd) return

        const timeoutId = window.setTimeout(() => {
            setShowAdd(false)
            setFeedback(createState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createState, showAdd])

    useEffect(() => {
        if (!updateState.success || !editingPerson) return

        const timeoutId = window.setTimeout(() => {
            setEditingPerson(null)
            setFeedback(updateState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [updateState, editingPerson])

    useEffect(() => {
        if (!createRecordState.success || !showAddRecord) return

        const timeoutId = window.setTimeout(() => {
            setShowAddRecord(false)
            setFeedback(createRecordState)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [createRecordState, showAddRecord])

    function handleDelete(personId: string) {
        if (!confirm('Bu kisiyi silmek istediginize emin misiniz?')) return

        startDeleteTransition(async () => {
            const result = await deletePersonAction(personId)
            setFeedback(result)
        })
    }

    return (
        <div>
            <FormMessage success={feedback?.success} message={feedback?.message} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Alacak</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400 privacy-blur">{formatCurrency(summary.totalReceivable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Verecek</p>
                    </div>
                    <p className="text-2xl font-bold text-red-400 privacy-blur">{formatCurrency(summary.totalPayable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Net Durum</p>
                    <p className={cn('text-2xl font-bold privacy-blur', summary.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(summary.net, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Geciken</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-400 privacy-blur">{summary.overdueCount}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <Plus className="w-4 h-4" /> Kişi Ekle
                </button>
                <button
                    onClick={() => {
                        setSelectedPersonId(people[0]?.id ?? null)
                        setShowAddRecord(true)
                    }}
                    className="flex items-center gap-2 px-5 py-3 border border-white/10 text-zinc-300 rounded-2xl hover:bg-white/5 transition-all"
                >
                    <ArrowUpRight className="w-4 h-4" /> Alacak / Verecek Kaydı
                </button>
                <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
                    {(['all', 'receivable', 'payable'] as const).map((item) => (
                        <button
                            key={item}
                            onClick={() => setFilter(item)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm transition-all',
                                filter === item ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white',
                            )}
                        >
                            {item === 'all' ? 'Tümü' : item === 'receivable' ? 'Bana Borçlu' : 'Benim Borçlarım'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="fintech-card p-5 mb-6">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">Bu sayfa ne işe yarar?</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-zinc-400">
                    <p>1. Kişiyi oluştur. Bu kişi arkadaş, aile, tedarikçi veya borç aldığın biri olabilir.</p>
                    <p>2. Bu kişi için alacak ya da verecek kaydı aç. Şahsi borçlar burada kişiyle bağlı kalır.</p>
                    <p>3. Tahsilat ve ödeme girdikçe hesap bakiyesi ve kişi durumu birlikte güncellenir.</p>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    {people.length === 0 ? 'Henüz kişi eklenmedi.' : 'Bu filtreye uygun kişi yok.'}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((person) => (
                        <div key={person.id} className="fintech-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all">
                            <Link href={`/people/${person.id}`} className="flex items-center gap-4 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-white truncate">{person.name}</h3>
                                    <p className="text-xs text-zinc-500 truncate privacy-blur">
                                        {person.activeCount} açık kayıt
                                        {person.phone ? ` • ${person.phone}` : ''}
                                    </p>
                                </div>
                            </Link>
                            <div className="flex items-center gap-6">
                                {person.totalReceivable > 0 ? (
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">Alacak</p>
                                        <p className="font-bold text-emerald-400 privacy-blur">{formatCurrency(person.totalReceivable, 'TRY')}</p>
                                    </div>
                                ) : null}
                                {person.totalPayable > 0 ? (
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">Verecek</p>
                                        <p className="font-bold text-red-400 privacy-blur">{formatCurrency(person.totalPayable, 'TRY')}</p>
                                    </div>
                                ) : null}
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Net</p>
                                    <p className={cn('font-bold privacy-blur', person.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {formatCurrency(person.netPosition, 'TRY')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedPersonId(person.id)
                                            setShowAddRecord(true)
                                        }}
                                        className="px-3 py-2 rounded-xl text-xs text-zinc-300 border border-white/10 hover:bg-white/5 transition-colors"
                                    >
                                        Kayıt ekle
                                    </button>
                                    <button
                                        onClick={() => setEditingPerson(person)}
                                        className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                                        aria-label={`${person.name} kaydını düzenle`}
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(person.id)}
                                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        aria-label={`${person.name} kaydını sil`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAdd ? (
                <Modal title="Kişi Ekle" onClose={() => setShowAdd(false)}>
                    <form action={createAction} className="space-y-4">
                        <input name="name" placeholder="Ad Soyad" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="phone" placeholder="Telefon (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <input name="email" type="email" placeholder="Email (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        </div>
                        <textarea name="notes" placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={createState.success} message={createState.message} />
                        <SubmitButton label="Kişiyi Kaydet" pendingLabel="Kaydediliyor..." />
                    </form>
                </Modal>
            ) : null}

            {editingPerson ? (
                <Modal title="Kişiyi Düzenle" onClose={() => setEditingPerson(null)}>
                    <form action={updateAction} className="space-y-4">
                        <input type="hidden" name="personId" value={editingPerson.id} />
                        <input name="name" defaultValue={editingPerson.name} placeholder="Ad Soyad" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input name="phone" defaultValue={editingPerson.phone ?? ''} placeholder="Telefon (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <input name="email" type="email" defaultValue={editingPerson.email ?? ''} placeholder="Email (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        </div>
                        <textarea name="notes" defaultValue={editingPerson.notes ?? ''} placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                        <FormMessage success={updateState.success} message={updateState.message} />
                        <SubmitButton label="Kişiyi Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>
                </Modal>
            ) : null}

            {showAddRecord ? (
                <Modal title="Alacak / Verecek Kaydı Ekle" onClose={() => setShowAddRecord(false)}>
                    {people.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
                            Önce kişi eklemen gerekiyor. Kişi kaydı olmadan şahsi alacak veya verecek açılmaz.
                        </div>
                    ) : (
                        <form action={createRecordAction} className="space-y-4">
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Kişi</label>
                                <select
                                    name="personId"
                                    defaultValue={selectedPersonId ?? people[0]?.id}
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white"
                                    required
                                >
                                    {people.map((person) => (
                                        <option key={person.id} value={person.id}>{person.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-2 block">Kayıt türü</label>
                                    <select name="type" defaultValue="PAYABLE" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white">
                                        <option value="PAYABLE">Benim borcum</option>
                                        <option value="RECEIVABLE">Bana borçlu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-2 block">Tutar</label>
                                    <input name="amount" type="number" min="0.01" step="0.01" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Açıklama</label>
                                <input name="description" placeholder="Örn: Ahmet'e elden verilen borç" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-2 block">Para birimi</label>
                                    <select name="currency" defaultValue="TRY" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white">
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-2 block">Vade</label>
                                    <input name="dueDate" type="date" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                                </div>
                            </div>
                            <textarea name="notes" placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <FormMessage success={createRecordState.success} message={createRecordState.message} />
                            <SubmitButton label="Kaydı Oluştur" pendingLabel="Kaydediliyor..." />
                        </form>
                    )}
                </Modal>
            ) : null}
        </div>
    )
}
