'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { addDebt } from '@/app/actions'

export default function DebtsClientWrapper() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-black px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-200"
            >
                <Plus className="w-4 h-4" /> Borç Ekle
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-3xl p-6 relative">
                        <h2 className="text-xl font-bold mb-6">Yeni Borç Ekle</h2>

                        <form action={async (formData) => {
                            await addDebt(formData)
                            setIsModalOpen(false)
                        }} className="space-y-4">

                            <div>
                                <label className="text-sm font-medium text-zinc-400">Borç Adı</label>
                                <input name="name" placeholder="Örn: Konut Kredisi, Kredi Kartı" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Tür</label>
                                    <select name="type" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1">
                                        <option value="CREDIT_CARD">Kredi Kartı</option>
                                        <option value="LOAN">Banka Kredisi</option>
                                        <option value="KMH">KMH / Artı Para</option>
                                        <option value="PERSONAL">Şahsi Borç</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Faiz Oranı (%)</label>
                                    <input name="interestRate" type="number" step="0.01" defaultValue="4.25" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-400">Toplam Bakiye</label>
                                <input name="totalBalance" type="number" step="0.01" placeholder="0.00" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-400">Kalan Bakiye</label>
                                <input name="remainingBalance" type="number" step="0.01" placeholder="0.00" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1" required />
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white">İptal</button>
                                <button type="submit" className="flex-1 bg-white text-black font-semibold rounded-xl py-3">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
