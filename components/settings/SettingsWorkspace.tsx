'use client'

import { useActionState, useState } from 'react'
import { CreditCard, Settings2, Bell, Shield, CheckCircle, User2, Lock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveCardFinanceSettingsAction } from '@/app/cards/card-settings-actions'
import { saveEvdsSettingsAction } from '@/app/settings/evds-actions'
import { updateProfileAction, changePasswordAction } from '@/app/settings/profile-actions'
import FormMessage from '@/components/ui/FormMessage'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT } from '@/lib/action-result'
import type { EvdsSettings } from '@/lib/evds-service'

interface CardSettingsData {
    contractualRate: number; defaultRate: number; cashAdvanceRate: number
    minPaymentRateBelow50k: number; minPaymentRateAbove50k: number
    kkdfRate: number; bsmvRate: number; notes: string | null; lastUpdated: string
}

interface Props {
    cardSettings: CardSettingsData | null
    evdsSettings: EvdsSettings
    aiSettings: {
        connectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR'
        model: string
        baseUrl: string
        hasProject: boolean
        hasOrg: boolean
    }
    canUseAi: boolean
    userProfile: {
        name: string
        email: string
        createdAt: string
    }
}

type DebtStrategy = 'AVALANCHE' | 'SNOWBALL' | 'HYBRID'

const DEBT_STRATEGIES: { key: DebtStrategy; title: string; description: string; icon: string }[] = [
    { key: 'AVALANCHE', title: 'Çığ Yöntemi', description: 'En yüksek faizli borçtan başla.', icon: '🏔️' },
    { key: 'SNOWBALL', title: 'Kartopu Yöntemi', description: 'En düşük bakiyeli borçtan başla.', icon: '⛄' },
    { key: 'HYBRID', title: 'Hibrit Yöntem', description: 'Faiz ve bakiye dengesini gözetir.', icon: '⚡' },
]

export default function SettingsWorkspace({ cardSettings, evdsSettings, aiSettings, canUseAi, userProfile }: Props) {
    const [debtStrategy, setDebtStrategy] = useState<DebtStrategy>('AVALANCHE')
    const [privacyMode, setPrivacyMode] = useState(true)
    const [notifications, setNotifications] = useState({
        paymentReminder: true, budgetAlert: true, goalProgress: true, weeklyReport: false,
    })
    const [saved, setSaved] = useState(false)

    const [profileState, profileAction] = useActionState(updateProfileAction, EMPTY_ACTION_RESULT)
    const [passwordState, passwordAction] = useActionState(changePasswordAction, EMPTY_ACTION_RESULT)
    const [evdsState, evdsAction] = useActionState(saveEvdsSettingsAction, EMPTY_ACTION_RESULT)

    function handleSavePreferences() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('finance_prefs', JSON.stringify({ debtStrategy, privacyMode, notifications }))
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="space-y-8">
            {saved && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-[color:var(--accent-success)] text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Tercihler kaydedildi.
                </div>
            )}

            {/* ===== Hesap Bilgileri ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <User2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Hesap Bilgileri</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Profile Form */}
                    <form action={profileAction} className="space-y-4">
                        <div>
                            <label className="form-label">Ad Soyad</label>
                            <input name="name" defaultValue={userProfile.name} className="form-input" required />
                        </div>
                        <div>
                            <label className="form-label">E-posta</label>
                            <input value={userProfile.email} className="form-input opacity-60" readOnly />
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Calendar className="w-3.5 h-3.5" />
                            Kayıt: {new Date(userProfile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <FormMessage success={profileState.success} message={profileState.message} />
                        <SubmitButton label="Profili Güncelle" pendingLabel="Güncelleniyor..." />
                    </form>

                    {/* Password Form */}
                    <form action={passwordAction} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Şifre Değiştir</h3>
                        </div>
                        <div>
                            <label className="form-label">Mevcut Şifre</label>
                            <input name="currentPassword" type="password" className="form-input" required />
                        </div>
                        <div>
                            <label className="form-label">Yeni Şifre</label>
                            <input name="newPassword" type="password" className="form-input" required minLength={6} />
                        </div>
                        <div>
                            <label className="form-label">Yeni Şifre (Tekrar)</label>
                            <input name="confirmPassword" type="password" className="form-input" required minLength={6} />
                        </div>
                        <FormMessage success={passwordState.success} message={passwordState.message} />
                        <SubmitButton label="Şifreyi Değiştir" pendingLabel="Değiştiriliyor..." />
                    </form>
                </div>
            </div>

            {/* ===== Borç Ödeme Stratejisi ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-5 h-5 text-violet-400" />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Borç Ödeme Stratejisi</h2>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                    Birden fazla borcunuz olduğunda hangi strateji ile ödeme planı oluşturulacağını seçin.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {DEBT_STRATEGIES.map((s) => (
                        <button key={s.key} onClick={() => setDebtStrategy(s.key)} className={cn(
                            'text-left p-4 rounded-2xl border transition-all cursor-pointer',
                            debtStrategy === s.key ? 'border-violet-500/40 bg-violet-500/10' : 'border-[var(--border-subtle)] bg-white/[0.02] hover:bg-white/[0.05]'
                        )}>
                            <span className="text-2xl">{s.icon}</span>
                            <h3 className="font-semibold mt-2 mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* ===== Bildirim Tercihleri ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-[color:var(--accent-warning)]" />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bildirim Tercihleri</h2>
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
                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                            </div>
                            <div className="relative">
                                <input type="checkbox" checked={notifications[item.key]} onChange={(e) => setNotifications((prev) => ({ ...prev, [item.key]: e.target.checked }))} className="sr-only peer" />
                                <div className="w-11 h-6 bg-zinc-700 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* ===== Gizlilik ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Settings2 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gizlilik & Görünüm</h2>
                </div>
                <label className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer">
                    <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Gizlilik Modu</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tutarları bulanıklaştır (ekran paylaşımı için ideal)</p>
                    </div>
                    <div className="relative">
                        <input type="checkbox" checked={privacyMode} onChange={(e) => setPrivacyMode(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-700 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
                    </div>
                </label>
                <button onClick={handleSavePreferences} className="w-full mt-6 py-3.5 btn-primary rounded-2xl">
                    Tercihleri Kaydet
                </button>
            </div>

            {/* ===== TCMB / EVDS Ayarları ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Settings2 className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>TCMB / EVDS Ayarları</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            API anahtarı şifreli saklanır. EVDS anahtarı boşsa dashboard piyasa kartları uyarı durumunda kalır.
                        </p>
                    </div>
                </div>

                <form action={evdsAction} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_180px] gap-4">
                        <div>
                            <label className="form-label">EVDS API anahtarı</label>
                            <input
                                name="apiKey"
                                type="password"
                                autoComplete="off"
                                placeholder={evdsSettings.hasApiKey ? 'Yeni anahtar girmezsen mevcut anahtar korunur' : 'TCMB EVDS API anahtarını gir'}
                                className="form-input"
                            />
                            {evdsSettings.hasApiKey ? (
                                <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    <input name="keepExistingApiKey" type="checkbox" defaultChecked className="rounded border-[var(--border-default)] bg-[var(--bg-input)]" />
                                    Mevcut API anahtarını koru
                                </label>
                            ) : null}
                        </div>
                        <div>
                            <label className="form-label">Cache süresi (dk)</label>
                            <input name="cacheMinutes" type="number" min="15" step="15" defaultValue={evdsSettings.cacheMinutes} className="form-input" />
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>TCMB’ye gereksiz yük bindirmemek için en az 15 dk.</p>
                        </div>
                    </div>

                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Göster</th>
                                    <th>Kart adı</th>
                                    <th>Alış seri kodu</th>
                                    <th>Satış seri kodu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evdsSettings.series.map((series) => {
                                    const isGramGold = series.code === 'XAU_GRAM'
                                    const isRepublicGold = series.code === 'XAU_REPUBLIC'
                                    const isGold = isGramGold || isRepublicGold
                                    const sellPlaceholder = isGramGold
                                        ? 'TP.MK.KUL.YTL'
                                        : isRepublicGold
                                            ? 'TP.MK.CUM.YTL'
                                            : 'TP.DK.USD.S.YTL'

                                    return (
                                        <tr key={series.code}>
                                            <td>
                                                <input
                                                    name={`${series.code}_enabled`}
                                                    type="checkbox"
                                                    defaultChecked={series.enabled}
                                                    className="h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-input)]"
                                                />
                                            </td>
                                            <td>
                                                <input name={`${series.code}_label`} defaultValue={series.label} className="form-input" />
                                            </td>
                                            <td>
                                                <input name={`${series.code}_buy`} defaultValue={series.buySeriesCode} placeholder={isGold ? 'Altında boş bırakılabilir' : 'TP.DK.USD.A.YTL'} className="form-input font-mono" />
                                            </td>
                                            <td>
                                                <input name={`${series.code}_sell`} defaultValue={series.sellSeriesCode} placeholder={sellPlaceholder} className="form-input font-mono" />
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Gram altın için TCMB EVDS serisi TP.MK.KUL.YTL, Cumhuriyet altını için TP.MK.CUM.YTL kullanılır. Bu seriler aylık satış fiyatıdır; döviz seri kodları altın kartlarında otomatik düzeltilir.
                    </p>

                    <FormMessage success={evdsState.success} message={evdsState.message} />
                    <SubmitButton label="EVDS Ayarlarını Kaydet" pendingLabel="Kaydediliyor..." />
                </form>
            </div>

            {/* ===== Kart Faiz Ayarları ===== */}
            <div className="fintech-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-5 h-5 text-[color:var(--accent-warning)]" />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Genel Kart Faiz Oranları</h2>
                </div>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                    Bu oranlar, &quot;Genel oranları kullan&quot; seçili olan tüm kartlara uygulanır.
                </p>
                <form action={saveCardFinanceSettingsAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div><label className="form-label">Akdi Faiz (%)</label><input name="contractualRate" type="number" step="0.01" defaultValue={cardSettings?.contractualRate ?? 4.25} className="form-input" required /></div>
                        <div><label className="form-label">Temerrüt Faiz (%)</label><input name="defaultRate" type="number" step="0.01" defaultValue={cardSettings?.defaultRate ?? 4.75} className="form-input" required /></div>
                        <div><label className="form-label">Nakit Avans Faiz (%)</label><input name="cashAdvanceRate" type="number" step="0.01" defaultValue={cardSettings?.cashAdvanceRate ?? 5.0} className="form-input" required /></div>
                        <div><label className="form-label">Asgari Ödeme ≤50k (%)</label><input name="minPaymentRateBelow50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateBelow50k ?? 0.30} className="form-input" required /></div>
                        <div><label className="form-label">Asgari Ödeme &gt;50k (%)</label><input name="minPaymentRateAbove50k" type="number" step="0.01" defaultValue={cardSettings?.minPaymentRateAbove50k ?? 0.25} className="form-input" required /></div>
                        <div><label className="form-label">KKDF (%)</label><input name="kkdfRate" type="number" step="0.01" defaultValue={cardSettings?.kkdfRate ?? 15.0} className="form-input" required /></div>
                        <div><label className="form-label">BSMV (%)</label><input name="bsmvRate" type="number" step="0.01" defaultValue={cardSettings?.bsmvRate ?? 10.0} className="form-input" required /></div>
                    </div>
                    <textarea name="notes" placeholder="Notlar (opsiyonel)" defaultValue={cardSettings?.notes ?? ''} className="form-input min-h-20" />
                    {cardSettings?.lastUpdated && (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Son güncelleme: {new Date(cardSettings.lastUpdated).toLocaleString('tr-TR')}</p>
                    )}
                    <button type="submit" className="w-full btn-primary py-4 rounded-2xl">Kaydet</button>
                </form>
            </div>

            {/* ===== AI Durumu ===== */}
            {canUseAi ? (
                <div className="fintech-card p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AI Çalışma Durumu</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: 'Efektif sağlayıcı', value: 'OPENAI', always: true },
                            { label: 'OPENAI_API_KEY', value: aiSettings.connectionStatus === 'HAZIR' ? 'HAZIR' : 'HATA', always: true, isError: aiSettings.connectionStatus !== 'HAZIR' },
                            { label: 'Aktif Model', value: aiSettings.model, always: true },
                            { label: 'Proxy/Gateway', value: 'VAR', always: aiSettings.baseUrl !== 'https://api.openai.com/v1' },
                            { label: 'OPENAI_PROJECT', value: aiSettings.hasProject ? 'VAR' : 'YOK', always: true },
                            { label: 'OPENAI_ORG', value: aiSettings.hasOrg ? 'VAR' : 'YOK', always: true },
                        ].filter((r) => r.always).map((row) => (
                            <div key={row.label} className="rounded-3xl p-4 md:p-5 flex items-center justify-between transition-all" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase",
                                    row.isError ? "bg-red-500/20 text-[color:var(--accent-danger)]" : "bg-zinc-800 text-zinc-100"
                                )}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {/* ===== Uygulama Bilgileri ===== */}
            <div className="fintech-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Settings2 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Uygulama Bilgileri</h2>
                </div>
                <div className="space-y-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <p>• Para birimi: TRY (varsayılan)</p>
                    <p>• Finansal hesaplamalar .toFixed(2) hassasiyetinde yapılır</p>
                    <p>• LedgerEntry kayıtları değiştirilemez (immutable)</p>
                    <p>• Tüm bakiye hareketleri atomik ($transaction) güvencesindedir</p>
                </div>
            </div>
        </div>
    )
}
