'use client'

import { useState } from 'react'
import { Plus, Users, ArrowDownLeft, ArrowUpRight, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { PersonWithSummary } from '@/lib/people-service'
import { formatCurrency, cn } from '@/lib/utils'
import { createPersonAction, deletePersonAction } from '@/app/people/actions'

interface Props {
    people: PersonWithSummary[]
    summary: { totalReceivable: number; totalPayable: number; net: number; overdueCount: number }
}

export default function PeopleWorkspace({ people, summary }: Props) {
    const [showAdd, setShowAdd] = useState(false)
    const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all')

    const filtered = people.filter((p) => {
        if (filter === 'receivable') return p.totalReceivable > 0
        if (filter === 'payable') return p.totalPayable > 0
        return true
    })

    return (
        <div>
            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Alacak</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalReceivable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="w-4 h-4 text-red-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Toplam Verecek</p>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalPayable, 'TRY')}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Net Durum</p>
                    <p className={cn('text-2xl font-bold', summary.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(summary.net, 'TRY')}
                    </p>
                </div>
                <div className="fintech-card p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Geciken</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{summary.overdueCount}</p>
                </div>
            </div>

            {/* Aksiyon Çubuğu */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-semibold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <Plus className="w-4 h-4" /> Kişi Ekle
                </button>
                <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
                    {(['all', 'receivable', 'payable'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm transition-all',
                                filter === f ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
                            )}
                        >
                            {f === 'all' ? 'Tümü' : f === 'receivable' ? 'Bana Borçlu' : 'Benim Borçlarım'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Kişi Listesi */}
            {filtered.length === 0 ? (
                <div className="fintech-card p-16 text-center text-zinc-400">
                    {people.length === 0 ? 'Henüz kişi eklenmedi.' : 'Bu filtreye uygun kişi yok.'}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((person) => (
                        <Link
                            key={person.id}
                            href={`/people/${person.id}`}
                            className="fintech-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all block"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold">
                                    {person.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{person.name}</h3>
                                    <p className="text-xs text-zinc-500">
                                        {person.activeCount} açık kayıt
                                        {person.phone ? ` • ${person.phone}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                {person.totalReceivable > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">Alacak</p>
                                        <p className="font-bold text-emerald-400">{formatCurrency(person.totalReceivable, 'TRY')}</p>
                                    </div>
                                )}
                                {person.totalPayable > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">Verecek</p>
                                        <p className="font-bold text-red-400">{formatCurrency(person.totalPayable, 'TRY')}</p>
                                    </div>
                                )}
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500">Net</p>
                                    <p className={cn('font-bold', person.netPosition >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {formatCurrency(person.netPosition, 'TRY')}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Kişi Ekleme Modalı */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
                    <div className="relative w-full max-w-lg fintech-card p-6 md:p-8 z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Kişi Ekle</h2>
                            <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white">✕</button>
                        </div>
                        <form action={createPersonAction} className="space-y-4">
                            <input name="name" placeholder="Ad Soyad" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input name="phone" placeholder="Telefon (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                                <input name="email" type="email" placeholder="Email (opsiyonel)" className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            </div>
                            <textarea name="notes" placeholder="Not (opsiyonel)" className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                            <button type="submit" onClick={() => setShowAdd(false)} className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all">
                                Kişiyi Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
