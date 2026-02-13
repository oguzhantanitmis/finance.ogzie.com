import React from 'react'
import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Plus, Trash2, Calendar, CreditCard as CardIcon, Tag } from 'lucide-react'
import { addSubscription, deleteSubscription } from '@/app/actions'
import { getBrandLogo } from '@/lib/logo-utils'
import { revalidatePath } from 'next/cache'


export const dynamic = 'force-dynamic'

async function getSubscriptions() {
    const session = await getServerSession(authOptions)
    if (!session) return null

    const user = await prisma.user.findUnique({ where: { email: session.user?.email! } })
    if (!user) return null

    return await prisma.subscription.findMany({
        where: { userId: user.id },
        orderBy: { nextPayment: 'asc' }
    })
}

export default async function SubscriptionsPage() {
    const subs = await getSubscriptions()

    if (!subs && process.env.NODE_ENV !== 'development') {
        redirect('/login')
    }

    const safeSubs = subs || []
    const totalMonthly = safeSubs.reduce((acc, s) => {
        if (s.billingCycle === 'MONTHLY') return acc + s.amount
        if (s.billingCycle === 'YEARLY') return acc + (s.amount / 12)
        return acc
    }, 0)

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white/20 pb-20 md:pb-0">
            <Navbar />

            <main className="md:ml-64 p-6 md:p-10 max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Abonelik Yönetimi</h1>
                        <p className="text-zinc-500 text-sm">Düzenli ödemelerini kontrol et ve optimize et.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-3xl">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Aylık Toplam Yük</p>
                            <p className="text-xl font-bold">{totalMonthly.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Subscription Form */}
                    <div className="lg:col-span-1">
                        <div className="fintech-card p-6 sticky top-10">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Yeni Abonelik
                            </h2>
                            <form action={addSubscription} className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block px-1">Abonelik Adı</label>
                                    <input
                                        name="name"
                                        placeholder="örn: Netflix, Spotify"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1.5 block px-1">Tutar</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            placeholder="0.00"
                                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1.5 block px-1">Döviz</label>
                                        <select
                                            name="currency"
                                            className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                        >
                                            <option value="TRY">TRY</option>
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block px-1">Ödeme Döngüsü</label>
                                    <select
                                        name="billingCycle"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                    >
                                        <option value="MONTHLY">Aylık</option>
                                        <option value="YEARLY">Yıllık</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block px-1">Kategori</label>
                                    <select
                                        name="category"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all"
                                    >
                                        <option value="Eğlence">Eğlence</option>
                                        <option value="Yazılım">Yazılım</option>
                                        <option value="Eğitim">Eğitim</option>
                                        <option value="Sağlık">Sağlık</option>
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1.5 block px-1">Sonraki Ödeme Tarihi</label>
                                    <input
                                        name="nextPayment"
                                        type="date"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 focus:border-white/30 outline-none transition-all text-white scheme-dark"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all mt-4"
                                >
                                    Ekle
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Subscriptions List */}
                    <div className="lg:col-span-2 space-y-4">
                        {safeSubs.length === 0 ? (
                            <div className="fintech-card p-20 text-center">
                                <Tag className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500">Henüz hiç abonelik eklemedin.</p>
                            </div>
                        ) : (
                            safeSubs.map((sub) => (
                                <div key={sub.id} className="fintech-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/5 overflow-hidden">
                                            {getBrandLogo(sub.name) ? (
                                                <img src={getBrandLogo(sub.name)!} alt={sub.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Tag className="w-6 h-6 text-zinc-400" />
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold">{sub.name}</h3>
                                            <div className="flex items-center gap-3 text-sm text-zinc-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(sub.nextPayment).toLocaleDateString('tr-TR')}
                                                </span>
                                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                                <span>{sub.category}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-10">
                                        <div className="text-right">
                                            <p className="text-xl font-bold">
                                                {sub.amount.toLocaleString('tr-TR', { style: 'currency', currency: sub.currency })}
                                            </p>
                                            <p className="text-xs text-zinc-500 uppercase tracking-widest">{sub.billingCycle === 'MONTHLY' ? 'Aylık' : 'Yıllık'}</p>
                                        </div>

                                        <form action={async () => {
                                            'use server'
                                            await deleteSubscription(sub.id)
                                        }}>
                                            <button className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
