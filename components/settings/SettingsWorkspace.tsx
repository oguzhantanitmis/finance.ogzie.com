'use client'

import { CreditCard, Settings2 } from 'lucide-react'
import { saveCardFinanceSettingsAction } from '@/app/cards/card-settings-actions'

interface CardSettingsData {
    contractualRate: number; defaultRate: number; cashAdvanceRate: number
    minPaymentRateBelow50k: number; minPaymentRateAbove50k: number
    kkdfRate: number; bsmvRate: number; notes: string | null; lastUpdated: string
}

interface Props {
    cardSettings: CardSettingsData | null
    aiConnectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR'
}

export default function SettingsWorkspace({ cardSettings, aiConnectionStatus }: Props) {
    return (
        <div className="space-y-8">
            {/* Genel Kart Faiz Ayarları */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    <h2 className="text-xl font-bold text-white">Genel Kart Faiz Oranları</h2>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                    Bu oranlar, &quot;Genel oranları kullan&quot; seçili olan tüm kartlara uygulanır. Kartlar kendi özel oranlarını da kullanabilir.
                </p>
                <form action={saveCardFinanceSettingsAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Akdi Faiz (%)</label>
                            <input name="contractualRate" type="number" step="0.01" defaultValue={cardSettings?.contractualRate ?? 4.25} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Temerrüt Faiz (%)</label>
                            <input name="defaultRate" type="number" step="0.01" defaultValue={cardSettings?.defaultRate ?? 4.75} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Nakit Avans Faiz (%)</label>
                            <input name="cashAdvanceRate" type="number" step="0.01" defaultValue={cardSettings?.cashAdvanceRate ?? 5.0} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Asgari Ödeme ≤50k (%)</label>
                            <input name="minPaymentRateBelow50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateBelow50k ?? 0.30} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Asgari Ödeme &gt;50k (%)</label>
                            <input name="minPaymentRateAbove50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateAbove50k ?? 0.25} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">KKDF (%)</label>
                            <input name="kkdfRate" type="number" step="0.01" defaultValue={cardSettings?.kkdfRate ?? 15.0} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">BSMV (%)</label>
                            <input name="bsmvRate" type="number" step="0.01" defaultValue={cardSettings?.bsmvRate ?? 10.0} className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" required />
                        </div>
                    </div>
                    <textarea name="notes" placeholder="Notlar (opsiyonel)" defaultValue={cardSettings?.notes ?? ''} className="w-full min-h-20 bg-black border border-white/10 rounded-2xl py-3 px-4 text-white" />
                    {cardSettings?.lastUpdated && (
                        <p className="text-xs text-zinc-600">Son güncelleme: {new Date(cardSettings.lastUpdated).toLocaleString('tr-TR')}</p>
                    )}
                    <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all">
                        Kaydet
                    </button>
                </form>
            </div>

            {/* AI Asistan Ayarları */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Yapay Zeka Asistanı</h2>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                    Yapay zeka özellikleri için sistem <code>OPENAI_API_KEY</code> çevre değişkenini (environment variable) kullanır. Proje veya organizasyon kimliğine gerek yoktur.
                </p>
                
                <div className="bg-black border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-white mb-1">OPENAI_API_KEY</p>
                        <p className="text-xs text-zinc-500">
                            {aiConnectionStatus === 'HAZIR' ? 'OpenAI servisi ile olan bağlantı başarılı.' : 
                             aiConnectionStatus === 'BAĞLANTI HATASI' ? 'Anahtar geçersiz veya servis anlık olarak ulaşılamaz.' : 
                             'Sistemde tanımlı bir anahtar bulunamadı.'}
                        </p>
                    </div>
                    <div className="shrink-0 flex items-center pr-2">
                        {aiConnectionStatus === 'HAZIR' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                BAĞLI
                            </span>
                        )}
                        {aiConnectionStatus === 'BAĞLANTI HATASI' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium tracking-wide border border-red-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                HATA
                            </span>
                        )}
                        {aiConnectionStatus === 'BEKLENİYOR' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 text-zinc-400 text-xs font-medium tracking-wide border border-zinc-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                EKSİK
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Genel Bilgi */}
            <div className="fintech-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Settings2 className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-xl font-bold text-white">Uygulama Bilgileri</h2>
                </div>
                <div className="space-y-3 text-sm text-zinc-400">
                    <p>• Para birimi: TRY (varsayılan)</p>
                    <p>• Finansal hesaplamalar .toFixed(2) hassasiyetinde yapılır</p>
                    <p>• LedgerEntry kayıtları değiştirilemez (immutable)</p>
                </div>
            </div>
        </div>
    )
}
