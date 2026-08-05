'use client'

import { useActionState, useEffect, useState } from 'react'
import {
    Bell, Calendar, CheckCircle, CreditCard, Info,
    Lock, LogOut, Monitor, Moon, Settings2, ShieldCheck, Sun, User2,
} from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { cn } from '@/lib/utils'
import { saveEvdsSettingsAction } from '@/app/settings/evds-actions'
import { updateProfileAction, changePasswordAction, signOutAllDevicesAction, updatePreferencesAction } from '@/app/settings/profile-actions'
import FormMessage from '@/components/ui/FormMessage'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT } from '@/lib/action-result'
import type { EvdsSettings } from '@/lib/evds-service'

interface Props {
    evdsSettings: EvdsSettings
    aiSettings: {
        isConfigured: boolean
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
        preferredCurrency: string
        locale: string
        timezone: string
    }
}

type Tab = 'hesap' | 'tercihler' | 'api'
type DebtStrategy = 'AVALANCHE' | 'SNOWBALL' | 'HYBRID'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'hesap',     label: 'Hesap & Güvenlik', icon: User2 },
    { key: 'tercihler', label: 'Tercihler',         icon: Bell },
    { key: 'api',       label: 'API & AI',           icon: Settings2 },
]

// ─── Toggle bileşeni ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer" aria-label={label}>
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
            <div className="w-11 h-6 rounded-full transition-colors peer-checked:bg-[var(--accent-success)]"
                style={{ background: checked ? 'var(--accent-success)' : 'var(--bg-elevated)' }} />
            <div className={cn(
                'absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                checked && 'translate-x-5'
            )} />
        </label>
    )
}

// ─── Ana bileşen ─────────────────────────────────────────────────────────────
export default function SettingsWorkspace({ evdsSettings, aiSettings, canUseAi, userProfile }: Props) {
    const prefKey = `finance_prefs:${userProfile.email.toLowerCase()}`
    const { choice: themeChoice, setChoice: setThemeChoice } = useTheme()
    const [activeTab, setActiveTab] = useState<Tab>('hesap')

    // Tercihler — localStorage'dan yükle
    const [debtStrategy, setDebtStrategy] = useState<DebtStrategy>('AVALANCHE')
    const [privacyMode,  setPrivacyMode]  = useState(true)
    const [notifications, setNotifications] = useState({
        paymentReminder: true, budgetAlert: true, goalProgress: true, weeklyReport: false,
    })
    const [prefSaved, setPrefSaved] = useState(false)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            try {
                const saved = localStorage.getItem(prefKey)
                if (saved) {
                    const p = JSON.parse(saved)
                    if (p.debtStrategy) setDebtStrategy(p.debtStrategy)
                    if (p.notifications) setNotifications(prev => ({ ...prev, ...p.notifications }))
                    if (typeof p.privacyMode === 'boolean') setPrivacyMode(p.privacyMode)
                }
            } catch { /* ignore */ }
        }, 0)
        return () => window.clearTimeout(timer)
    }, [prefKey])

    function savePreferences() {
        localStorage.setItem(prefKey, JSON.stringify({ debtStrategy, privacyMode, notifications }))
        setPrefSaved(true)
        setTimeout(() => setPrefSaved(false), 3000)
    }

    const [profileState, profileAction]   = useActionState(updateProfileAction, EMPTY_ACTION_RESULT)
    const [passwordState, passwordAction] = useActionState(changePasswordAction, EMPTY_ACTION_RESULT)
    const [prefsState,    prefsAction]    = useActionState(updatePreferencesAction, EMPTY_ACTION_RESULT)
    const [evdsState,     evdsAction]     = useActionState(saveEvdsSettingsAction, EMPTY_ACTION_RESULT)

    // Tabs göster: canUseAi değilse API sekmesi gizli
    const visibleTabs = canUseAi ? TABS : TABS.filter(t => t.key !== 'api')

    return (
        <div className="space-y-6">

            {/* Tab bar */}
            <div className="filter-group overflow-x-auto scrollbar-hide">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn('filter-tab flex items-center gap-2', activeTab === tab.key && 'filter-tab-active')}
                    >
                        <tab.icon className="w-3.5 h-3.5 shrink-0" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════ HESAP & GÜVENLİK ══════════ */}
            {activeTab === 'hesap' && (
                <div className="space-y-6">
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <User2 className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profil</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Profil formu */}
                            <form action={profileAction} className="space-y-4">
                                <div>
                                    <label className="form-label">Ad Soyad</label>
                                    <input name="name" defaultValue={userProfile.name} className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">E-posta</label>
                                    <input value={userProfile.email} className="form-input opacity-60" readOnly />
                                </div>
                                <div>
                                    <label className="form-label">Ana Para Birimi</label>
                                    <select name="preferredCurrency" defaultValue={userProfile.preferredCurrency} className="form-input form-select">
                                        <option value="TRY">₺ Türk Lirası (TRY)</option>
                                        <option value="USD">$ ABD Doları (USD)</option>
                                        <option value="EUR">€ Euro (EUR)</option>
                                        <option value="GBP">£ İngiliz Sterlini (GBP)</option>
                                        <option value="XAU">Au Gram Altın (XAU)</option>
                                    </select>
                                </div>
                                <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                    <Calendar className="w-3.5 h-3.5" />
                                    Kayıt: {new Date(userProfile.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <FormMessage success={profileState.success} message={profileState.message} />
                                <SubmitButton label="Profili Güncelle" pendingLabel="Güncelleniyor..." />
                            </form>

                            {/* Şifre formu */}
                            <form action={passwordAction} className="space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Lock className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Şifre Değiştir</h3>
                                </div>
                                <div>
                                    <label className="form-label">Mevcut Şifre</label>
                                    <input name="currentPassword" type="password" className="form-input" required />
                                </div>
                                <div>
                                    <label className="form-label">Yeni Şifre</label>
                                    <input name="newPassword" type="password" className="form-input" required minLength={8} />
                                </div>
                                <div>
                                    <label className="form-label">Yeni Şifre (Tekrar)</label>
                                    <input name="confirmPassword" type="password" className="form-input" required minLength={8} />
                                </div>
                                <FormMessage success={passwordState.success} message={passwordState.message} />
                                <SubmitButton label="Şifreyi Değiştir" pendingLabel="Değiştiriliyor..." />
                            </form>
                        </div>
                    </div>

                    {/* Oturum güvenliği */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent-success)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Oturum Güvenliği</h2>
                        </div>
                        <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Beni hatırla:</strong> 30 gün JWT
                                &nbsp;·&nbsp; <strong style={{ color: 'var(--text-primary)' }}>Normal oturum:</strong> 8 saat JWT
                                &nbsp;·&nbsp; Şifre değişimi tüm cihazlarda oturumu kapatır.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
                            <div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tüm cihazlardan çıkış</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    Aktif tüm JWT oturumları geçersiz hale getirilir.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!confirm('Tüm cihazlardaki oturumlar sonlandırılacak. Devam?')) return
                                    await signOutAllDevicesAction()
                                }}
                                className="btn-secondary flex items-center gap-2 text-sm whitespace-nowrap"
                                style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger-border)' }}
                            >
                                <LogOut className="w-4 h-4" />
                                Tüm oturumları sonlandır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ TERCİHLER ══════════ */}
            {activeTab === 'tercihler' && (
                <div className="space-y-6">
                    {prefSaved && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                            style={{ background: 'var(--accent-success-bg)', border: '1px solid var(--accent-success-border)', color: 'var(--accent-success)' }}>
                            <CheckCircle className="w-4 h-4" /> Tercihler kaydedildi.
                        </div>
                    )}

                    {/* Borç stratejisi */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Borç Ödeme Stratejisi</h2>
                        </div>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                            Birden fazla borç olduğunda ödeme planı hangi stratejiyle oluşturulsun?
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                { key: 'AVALANCHE' as DebtStrategy, title: 'Çığ Yöntemi',    desc: 'En yüksek faizden başla',      icon: '🏔️' },
                                { key: 'SNOWBALL'  as DebtStrategy, title: 'Kartopu Yöntemi', desc: 'En düşük bakiyeden başla',      icon: '⛄' },
                                { key: 'HYBRID'   as DebtStrategy, title: 'Hibrit',           desc: 'Faiz ve bakiye dengesi',        icon: '⚡' },
                            ].map(s => (
                                <button key={s.key} onClick={() => setDebtStrategy(s.key)}
                                    className={cn('text-left p-4 rounded-2xl border transition-all cursor-pointer',
                                        debtStrategy === s.key
                                            ? 'border-[var(--accent-purple)] bg-[var(--accent-purple-bg)]'
                                            : 'border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-hover)]'
                                    )}>
                                    <span className="text-2xl">{s.icon}</span>
                                    <h3 className="font-semibold mt-2 mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bildirimler */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <Bell className="w-5 h-5" style={{ color: 'var(--accent-warning)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bildirim Tercihleri</h2>
                        </div>
                        <div className="space-y-3">
                            {([
                                { key: 'paymentReminder', label: 'Ödeme Hatırlatıcıları', desc: 'Yaklaşan kart ve abonelik ödemeleri' },
                                { key: 'budgetAlert',     label: 'Bütçe Uyarıları',       desc: 'Harcama limiti aşıldığında' },
                                { key: 'goalProgress',    label: 'Hedef İlerlemesi',       desc: 'Yeni ilerleme kaydedildiğinde' },
                                { key: 'weeklyReport',    label: 'Haftalık Rapor',          desc: 'Haftalık finansal durum özeti' },
                            ] as const).map(item => (
                                <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl transition-all"
                                    style={{ border: '1px solid var(--border-default)', background: 'transparent' }}>
                                    <div>
                                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                    <Toggle
                                        checked={notifications[item.key]}
                                        onChange={v => setNotifications(prev => ({ ...prev, [item.key]: v }))}
                                        label={item.label}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tema */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <Monitor className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tema</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { key: 'dark',   label: 'Koyu',   icon: Moon    },
                                { key: 'light',  label: 'Açık',   icon: Sun     },
                                { key: 'system', label: 'Sistem', icon: Monitor },
                            ] as const).map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => setThemeChoice(opt.key)}
                                    className={cn(
                                        'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer',
                                        themeChoice === opt.key
                                            ? 'border-[var(--accent-primary)] bg-[var(--accent-info-bg)]'
                                            : 'border-[var(--border-default)] hover:bg-[var(--bg-hover)]'
                                    )}
                                >
                                    <opt.icon
                                        className="w-5 h-5"
                                        style={{ color: themeChoice === opt.key ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                    />
                                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bölgesel Ayarlar — ana para birimi Profil kartından yönetilir */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Bölgesel Ayarlar</h2>
                        </div>
                        <form action={prefsAction} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Locale</label>
                                    <select name="locale" defaultValue={userProfile.locale} className="form-input form-select">
                                        <option value="tr-TR">Türkçe (tr-TR)</option>
                                        <option value="en-US">English (en-US)</option>
                                        <option value="en-GB">English UK (en-GB)</option>
                                        <option value="de-DE">Deutsch (de-DE)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Saat Dilimi</label>
                                    <select name="timezone" defaultValue={userProfile.timezone} className="form-input form-select">
                                        <option value="Europe/Istanbul">Europe/Istanbul (TR)</option>
                                        <option value="Europe/London">Europe/London (UK)</option>
                                        <option value="Europe/Berlin">Europe/Berlin (DE)</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                            </div>
                            <FormMessage success={prefsState.success} message={prefsState.message} />
                            <SubmitButton label="Tercihleri Kaydet" pendingLabel="Kaydediliyor..." />
                        </form>
                    </div>

                    {/* Gizlilik */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <Settings2 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Gizlilik</h2>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl"
                            style={{ border: '1px solid var(--border-default)' }}>
                            <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Gizlilik Modu</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tutarları bulanıklaştır (ekran paylaşımı için ideal)</p>
                            </div>
                            <Toggle checked={privacyMode} onChange={setPrivacyMode} label="Gizlilik Modu" />
                        </div>
                        <button onClick={savePreferences} className="w-full btn-primary py-3.5 mt-5">
                            Tercihleri Kaydet
                        </button>
                    </div>
                </div>
            )}

            {/* ══════════ API & AI (sadece superuser) ══════════ */}
            {activeTab === 'api' && canUseAi && (
                <div className="space-y-6">
                    {/* CollectAPI */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Settings2 className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>CollectAPI Ayarları</h2>
                        </div>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                            Piyasa kuru kartları bu sağlayıcıdan beslenir. Tüm kullanıcılara uygulanır.
                        </p>
                        <form action={evdsAction} className="space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-4">
                                <div>
                                    <label className="form-label">CollectAPI API anahtarı</label>
                                    <input name="apiKey" type="password" autoComplete="off"
                                        placeholder={evdsSettings.hasApiKey ? 'Yeni anahtar girilmezse mevcut korunur' : 'CollectAPI API anahtarını gir'}
                                        className="form-input" />
                                    {evdsSettings.hasApiKey && evdsSettings.apiKeySource === 'user' && (
                                        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <input name="keepExistingApiKey" type="checkbox" defaultChecked />
                                            Mevcut anahtarı koru
                                        </label>
                                    )}
                                </div>
                                <div>
                                    <label className="form-label">Cache süresi (dk)</label>
                                    <input name="cacheMinutes" type="number" min="15" step="15" defaultValue={evdsSettings.cacheMinutes} className="form-input" />
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Min. 15 dk önerilir.</p>
                                </div>
                            </div>

                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Göster</th><th>Kart adı</th><th>Endpoint / Key</th></tr>
                                    </thead>
                                    <tbody>
                                        {evdsSettings.series.map(series => {
                                            const endpoint = ['XAU_GRAM','XAU_REPUBLIC'].includes(series.code) ? '/economy/goldPrice' : '/economy/allCurrency'
                                            const key = series.sellSeriesCode || series.buySeriesCode || series.code
                                            return (
                                                <tr key={series.code}>
                                                    <td>
                                                        <input name={`${series.code}_enabled`} type="checkbox" defaultChecked={series.enabled}
                                                            className="h-4 w-4 rounded" />
                                                    </td>
                                                    <td>
                                                        <input name={`${series.code}_label`} defaultValue={series.label} className="form-input" />
                                                    </td>
                                                    <td>
                                                        <input type="hidden" name={`${series.code}_buy`}  defaultValue={series.buySeriesCode} />
                                                        <input type="hidden" name={`${series.code}_sell`} defaultValue={series.sellSeriesCode} />
                                                        <span className="font-mono text-xs block" style={{ color: 'var(--text-secondary)' }}>{endpoint}</span>
                                                        <span className="font-mono text-xs"    style={{ color: 'var(--text-muted)'  }}>{key}</span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <FormMessage success={evdsState.success} message={evdsState.message} />
                            <SubmitButton label="CollectAPI Ayarlarını Kaydet" pendingLabel="Kaydediliyor..." />
                        </form>
                    </div>

                    {/* AI Durumu */}
                    <div className="fintech-card p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <Info className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Çalışma Durumu</h2>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'API Anahtarı',    value: aiSettings.isConfigured ? 'HAZIR'  : 'EKSİK',   ok: aiSettings.isConfigured },
                                { label: 'Model',           value: aiSettings.model,                                ok: true },
                                { label: 'OPENAI_PROJECT',  value: aiSettings.hasProject   ? 'VAR'    : 'YOK',      ok: aiSettings.hasProject },
                                { label: 'OPENAI_ORG',      value: aiSettings.hasOrg       ? 'VAR'    : 'YOK',      ok: aiSettings.hasOrg },
                                { label: 'Base URL',        value: aiSettings.baseUrl,                              ok: true },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between p-4 rounded-xl"
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                                    <span className={cn(
                                        'text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider',
                                        row.ok ? 'bg-[var(--accent-success-bg)] text-[var(--accent-success)]'
                                               : 'bg-[var(--accent-danger-bg)] text-[var(--accent-danger)]'
                                    )}>
                                        {row.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Uygulama bilgileri */}
                    <div className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Uygulama Bilgileri</h2>
                        </div>
                        <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <p>• Para birimi: TRY (varsayılan)</p>
                            <p>• Finansal hesaplamalar .toFixed(2) hassasiyetinde</p>
                            <p>• LedgerEntry kayıtları immutable</p>
                            <p>• Tüm bakiye hareketleri atomic ($transaction)</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
