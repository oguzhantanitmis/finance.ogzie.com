'use client'

import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { addCreditCard } from '@/app/cards/actions'

const CARD_COLORS = [
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
]

const BANKS = [
    'Akbank', 'Garanti BBVA', 'Yapı Kredi', 'İş Bankası', 'Ziraat Bankası',
    'Halkbank', 'Vakıfbank', 'Finansbank', 'Denizbank', 'TEB',
    'HSBC', 'ING', 'Enpara', 'Papara', 'Diğer'
]

export default function AddCardButton() {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0])
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.set('color', selectedColor)
        await addCreditCard(formData)
        setIsOpen(false)
        setLoading(false)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-all text-sm"
            >
                <Plus className="w-4 h-4" /> Yeni Kart
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg fintech-card p-8 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-6">💳 Yeni Kredi Kartı Ekle</h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Kart Adı */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-1 block">Kart Adı</label>
                                <input
                                    name="cardName"
                                    required
                                    placeholder="Akbank Axess Platinum"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none transition-colors"
                                />
                            </div>

                            {/* Banka */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-1 block">Banka</label>
                                <select
                                    name="bankName"
                                    required
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                                >
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            {/* Son 4 Hane & Ağ */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Son 4 Hane</label>
                                    <input
                                        name="last4Digits"
                                        maxLength={4}
                                        placeholder="4532"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Kart Ağı</label>
                                    <select
                                        name="cardNetwork"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none"
                                    >
                                        <option value="VISA">VISA</option>
                                        <option value="MASTERCARD">Mastercard</option>
                                        <option value="TROY">Troy</option>
                                    </select>
                                </div>
                            </div>

                            {/* Limitler */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Toplam Limit (₺)</label>
                                    <input
                                        name="totalLimit"
                                        type="number"
                                        required
                                        placeholder="50000"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Nakit Avans Limiti (₺)</label>
                                    <input
                                        name="cashAdvanceLimit"
                                        type="number"
                                        placeholder="25000"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            {/* Tarihler */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Hesap Kesim Günü</label>
                                    <input
                                        name="cutOffDay"
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="15"
                                        required
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-1 block">Hesap Kesim Günü</label>
                                        <input
                                            name="cutOffDay"
                                            type="number"
                                            min="1"
                                            max="31"
                                            placeholder="15"
                                            required
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-zinc-400 mb-1 block">Birikmiş Puan</label>
                                        <input
                                            name="rewardsPoints"
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Son Ödeme Günü</label>

                                    <input
                                        name="paymentDueDay"
                                        type="number"
                                        min="1"
                                        max="31"
                                        placeholder="5"
                                        required
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono"
                                    />
                                </div>
                            </div>

                            {/* Faiz Oranları */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Akdi Faiz (%)</label>
                                    <input
                                        name="contractualRate"
                                        type="number"
                                        step="0.01"
                                        placeholder="4.42"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">Gecikme (%)</label>
                                    <input
                                        name="defaultRate"
                                        type="number"
                                        step="0.01"
                                        placeholder="5.42"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-zinc-400 mb-1 block">N. Avans (%)</label>
                                    <input
                                        name="cashAdvanceRate"
                                        type="number"
                                        step="0.01"
                                        placeholder="5.92"
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-white/30 outline-none font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* Kart Rengi */}
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">Kart Rengi</label>
                                <div className="flex gap-2 flex-wrap">
                                    {CARD_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setSelectedColor(c)}
                                            className={`w-8 h-8 rounded-full transition-all ${selectedColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-60 hover:opacity-100'
                                                }`}
                                            style={{ background: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Ekleniyor...' : 'Kartı Ekle'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
