'use client'

import { CreditCard, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveCardFinanceSettingsAction } from '@/app/cards/card-settings-actions'

interface CardSettingsData {
    contractualRate: number; defaultRate: number; cashAdvanceRate: number
    minPaymentRateBelow50k: number; minPaymentRateAbove50k: number
    kkdfRate: number; bsmvRate: number; notes: string | null; lastUpdated: string
}

interface Props {
    cardSettings: CardSettingsData | null
    aiSettings: {
        connectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR'
        model: string
        baseUrl: string
        hasProject: boolean
        hasOrg: boolean
    }
}

export default function SettingsWorkspace({ cardSettings, aiSettings }: Props) {
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
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Çalışma durumu</h2>
                </div>
                
                <div className="space-y-3">
                    {/* Efektif Sağlayıcı */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">Efektif sağlayıcı</span>
                        <span className="px-4 py-1.5 rounded-full bg-white text-black text-[10px] font-black tracking-widest uppercase">
                            OPENAI
                        </span>
                    </div>

                    {/* API Key Durumu */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">OPENAI_API_KEY</span>
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase",
                            aiSettings.connectionStatus === 'HAZIR' ? "bg-zinc-800 text-zinc-100" : "bg-red-500/20 text-red-400"
                        )}>
                            {aiSettings.connectionStatus === 'HAZIR' ? 'HAZIR' : 'HATA'}
                        </span>
                    </div>

                    {/* Model Bilgisi */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">Aktif Model</span>
                        <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase">
                            {aiSettings.model}
                        </span>
                    </div>

                    {/* Base URL (varsayılansa gizle veya göster) */}
                    {aiSettings.baseUrl !== 'https://api.openai.com/v1' && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                            <span className="text-zinc-400 font-medium">Proxy/Gateway</span>
                            <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase truncate max-w-[150px]">
                                VAR
                            </span>
                        </div>
                    )}

                    {/* Project & Org */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">OPENAI_PROJECT</span>
                        <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase">
                            {aiSettings.hasProject ? 'VAR' : 'YOK'}
                        </span>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">OPENAI_ORG</span>
                        <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase">
                            {aiSettings.hasOrg ? 'VAR' : 'YOK'}
                        </span>
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
