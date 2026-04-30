'use client'

import { useState, useTransition } from 'react'
import { CreditCard, Settings2, Bell, Shield, Loader2, CheckCircle } from 'lucide-react'
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

type DebtStrategy = 'AVALANCHE' | 'SNOWBALL' | 'HYBRID'

const DEBT_STRATEGIES: { key: DebtStrategy; title: string; description: string; icon: string }[] = [
    { key: 'AVALANCHE', title: 'Çığ Yöntemi', description: 'En yüksek faizli borçtan başla. Matematiksel olarak en az faiz ödenir.', icon: '🏔️' },
    { key: 'SNOWBALL', title: 'Kartopu Yöntemi', description: 'En düşük bakiyeli borçtan başla. Motivasyon arttırır, hızlı kapanışlar sağlar.', icon: '⛄' },
    { key: 'HYBRID', title: 'Hibrit Yöntem', description: 'Faiz ve bakiye dengesini gözetir. Hem verimli hem motive edici.', icon: '⚡' },
]

export default function SettingsWorkspace({ cardSettings, aiSettings }: Props) {
    const [debtStrategy, setDebtStrategy] = useState<DebtStrategy>('AVALANCHE')
    const [privacyMode, setPrivacyMode] = useState(true)
    const [notifications, setNotifications] = useState({
        paymentReminder: true,
        budgetAlert: true,
        goalProgress: true,
        weeklyReport: false,
    })
    const [saved, setSaved] = useState(false)

    function handleSavePreferences() {
        // Client-side state only for now; ayarlar localStorage'a kaydedilebilir
        if (typeof window !== 'undefined') {
            localStorage.setItem('finance_prefs', JSON.stringify({ debtStrategy, privacyMode, notifications }))
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="space-y-8">
            {/* Bildirim */}
            {saved && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-[color:var(--accent-success)] text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <CheckCircle className="w-4 h-4" />
                    Tercihler kaydedildi.
                </div>
            )}

            {/* Borç Ödeme Stratejisi */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-5 h-5 text-violet-400" />
                    <h2 className="text-xl font-bold text-white">Borç Ödeme Stratejisi</h2>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                    Birden fazla borcunuz olduğunda hangi strateji ile ödeme planı oluşturulacağını seçin. AI önerileri ve simülasyonlar bu stratejiyi baz alır.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DEBT_STRATEGIES.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setDebtStrategy(s.key)}
                            className={cn(
                                'text-left p-4 rounded-2xl border transition-all',
                                debtStrategy === s.key
                                    ? 'border-violet-500/40 bg-violet-500/10'
                                    : 'border-[var(--border-subtle)] bg-white/[0.02] hover:bg-white/[0.05]'
                            )}
                        >
                            <span className="text-2xl">{s.icon}</span>
                            <h3 className="font-semibold text-white mt-2 mb-1 text-sm">{s.title}</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bildirim Tercihleri */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-[color:var(--accent-warning)]" />
                    <h2 className="text-xl font-bold text-white">Bildirim Tercihleri</h2>
                </div>
                <div className="space-y-3">
                    {([
                        { key: 'paymentReminder', label: 'Ödeme Hatırlatıcıları', desc: 'Yaklaşan kart, abonelik ve sabit gider ödemeleri' },
                        { key: 'budgetAlert', label: 'Bütçe Uyarıları', desc: 'Harcama limiti aşıldığında uyarı' },
                        { key: 'goalProgress', label: 'Hedef İlerlemesi', desc: 'Hedeflerinize yeni ilerleme kaydedildiğinde' },
                        { key: 'weeklyReport', label: 'Haftalık Rapor', desc: 'Her hafta finansal durum özeti' },
                    ] as const).map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                            <div>
                                <p className="text-white font-medium text-sm">{item.label}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={notifications[item.key]}
                                    onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-700 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Gizlilik */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Settings2 className="w-5 h-5 text-zinc-400" />
                    <h2 className="text-xl font-bold text-white">Gizlilik & Görünüm</h2>
                </div>
                <label className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                    <div>
                        <p className="text-white font-medium text-sm">Gizlilik Modu</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tutarları bulanıklaştır (ekran paylaşımı için ideal)</p>
                    </div>
                    <div className="relative">
                        <input
                            type="checkbox"
                            checked={privacyMode}
                            onChange={(e) => setPrivacyMode(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                    </div>
                </label>

                <button
                    onClick={handleSavePreferences}
                    className="w-full mt-6 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    Tercihleri Kaydet
                </button>
            </div>

            {/* Genel Kart Faiz Ayarları */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-5 h-5 text-[color:var(--accent-warning)]" />
                    <h2 className="text-xl font-bold text-white">Genel Kart Faiz Oranları</h2>
                </div>
                <p className="text-sm text-zinc-400 mb-6">
                    Bu oranlar, &quot;Genel oranları kullan&quot; seçili olan tüm kartlara uygulanır. Kartlar kendi özel oranlarını da kullanabilir.
                </p>
                <form action={saveCardFinanceSettingsAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Akdi Faiz (%)</label>
                            <input name="contractualRate" type="number" step="0.01" defaultValue={cardSettings?.contractualRate ?? 4.25} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Temerrüt Faiz (%)</label>
                            <input name="defaultRate" type="number" step="0.01" defaultValue={cardSettings?.defaultRate ?? 4.75} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Nakit Avans Faiz (%)</label>
                            <input name="cashAdvanceRate" type="number" step="0.01" defaultValue={cardSettings?.cashAdvanceRate ?? 5.0} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Asgari Ödeme ≤50k (%)</label>
                            <input name="minPaymentRateBelow50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateBelow50k ?? 0.30} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Asgari Ödeme &gt;50k (%)</label>
                            <input name="minPaymentRateAbove50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateAbove50k ?? 0.25} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">KKDF (%)</label>
                            <input name="kkdfRate" type="number" step="0.01" defaultValue={cardSettings?.kkdfRate ?? 15.0} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">BSMV (%)</label>
                            <input name="bsmvRate" type="number" step="0.01" defaultValue={cardSettings?.bsmvRate ?? 10.0} className="w-full bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" required />
                        </div>
                    </div>
                    <textarea name="notes" placeholder="Notlar (opsiyonel)" defaultValue={cardSettings?.notes ?? ''} className="w-full min-h-20 bg-black border border-[var(--border-default)] rounded-2xl py-3 px-4 text-white" />
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
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI Çalışma Durumu</h2>
                </div>
                
                <div className="space-y-3">
                    <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">Efektif sağlayıcı</span>
                        <span className="px-4 py-1.5 rounded-full bg-white text-black text-[10px] font-black tracking-widest uppercase">
                            OPENAI
                        </span>
                    </div>

                    <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">OPENAI_API_KEY</span>
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase",
                            aiSettings.connectionStatus === 'HAZIR' ? "bg-zinc-800 text-zinc-100" : "bg-red-500/20 text-[color:var(--accent-danger)]"
                        )}>
                            {aiSettings.connectionStatus === 'HAZIR' ? 'HAZIR' : 'HATA'}
                        </span>
                    </div>

                    <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">Aktif Model</span>
                        <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase">
                            {aiSettings.model}
                        </span>
                    </div>

                    {aiSettings.baseUrl !== 'https://api.openai.com/v1' && (
                        <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                            <span className="text-zinc-400 font-medium">Proxy/Gateway</span>
                            <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase truncate max-w-[150px]">
                                VAR
                            </span>
                        </div>
                    )}

                    <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <span className="text-zinc-400 font-medium">OPENAI_PROJECT</span>
                        <span className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-100 text-[10px] font-black tracking-widest uppercase">
                            {aiSettings.hasProject ? 'VAR' : 'YOK'}
                        </span>
                    </div>

                    <div className="bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-3xl p-4 md:p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
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
                    <p>• Tüm bakiye hareketleri atomik ($transaction) güvencesindedir</p>
                </div>
            </div>
        </div>
    )
}
