'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addAsset } from '@/app/actions'

export default function AssetsClientWrapper() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-black px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-200"
            >
                <Plus className="w-4 h-4" /> Varlık Ekle
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-3xl p-6 relative">
                        <h2 className="text-xl font-bold mb-6">Yeni Varlık Ekle</h2>

                        <form action={async (formData) => {
                            await addAsset(formData)
                            setIsModalOpen(false)
                        }} className="space-y-4">

                            <div>
                                <label className="text-sm font-medium text-zinc-400">Varlık Adı</label>
                                <input name="name" placeholder="Örn: Ziraat Bankası, Altın Hesabı" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1 text-white" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Tür</label>
                                    <select name="type" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1 text-white">
                                        <option value="CASH">Nakit</option>
                                        <option value="BANK">Banka Hesabı</option>
                                        <option value="GOLD">Altın</option>
                                        <option value="FX">Döviz</option>
                                        <option value="CRYPTO">Kripto</option>
                                        <option value="STOCK">Hisse Senedi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-400">Para Birimi</label>
                                    <select name="currency" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1 text-white">
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="XAU">XAU (Gr Altın)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-zinc-400">Miktar</label>
                                <input name="amount" type="number" step="0.01" placeholder="0.00" className="w-full bg-[#1a1a1a] rounded-xl p-3 border border-white/5 mt-1 text-white" required />
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
