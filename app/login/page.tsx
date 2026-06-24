'use client'

import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck, Wallet, TrendingUp, Repeat, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import AlienDialLoader from '@/components/AlienDialLoader'

type Mode = 'login' | 'forgot' | 'reset' | 'forgot-sent' | 'reset-done'

const MODE_SUBTITLE: Record<Mode, string> = {
    'login': 'Kişisel finans kontrol merkezi',
    'forgot': 'Şifre sıfırlama',
    'forgot-sent': 'E-posta gönderildi',
    'reset': 'Yeni şifre belirleyin',
    'reset-done': 'Şifre güncellendi',
}

const HERO_FEATURES = [
    { icon: Wallet, title: 'Aylık kontrol merkezi', desc: 'Gelir, sabit gider ve borç baskısını tek ekranda gör.' },
    { icon: Repeat, title: 'Borç & abonelik takibi', desc: 'Yaklaşan ödemeler ve düzenli giderler otomatik hatırlatılır.' },
    { icon: TrendingUp, title: 'Canlı piyasa verileri', desc: 'Döviz, altın ve net pozisyonun anlık akar.' },
]

function LoginInner() {
    const params = useSearchParams()
    const resetToken = params.get('reset')

    const [mode, setMode]             = useState<Mode>(resetToken ? 'reset' : 'login')
    const [email, setEmail]           = useState('')
    const [password, setPassword]     = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPass, setShowPass]     = useState(false)
    const [loading, setLoading]       = useState(false)
    const [error, setError]           = useState('')
    const [showIntro, setShowIntro]   = useState(true)

    useEffect(() => {
        if (resetToken) setMode('reset')
    }, [resetToken])

    // Intro animasyonunu Esc/Enter ile geç.
    useEffect(() => {
        if (!showIntro) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Enter') setShowIntro(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [showIntro])

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const result = await signIn('credentials', {
                email, password, rememberMe: String(rememberMe), redirect: false,
            })
            if (result?.error) {
                if (result.error.startsWith('LOCKED:')) {
                    setError(`Çok fazla başarısız deneme. Hesabınız ${result.error.split(':')[1]} dakika kilitli.`)
                } else if (result.error.startsWith('ATTEMPTS:')) {
                    setError(`Hatalı şifre. ${result.error.split(':')[1]} deneme hakkınız kaldı.`)
                } else {
                    setError('E-posta veya şifre hatalı.')
                }
            } else {
                window.location.assign('/')
            }
        } catch {
            setError('Bir hata oluştu. Lütfen tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    async function handleForgot(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            setMode('forgot-sent')
        } catch {
            setError('Bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    async function handleReset(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword !== confirmPass) {
            setError('Yeni şifreler eşleşmiyor.'); return
        }
        if (newPassword.length < 8) {
            setError('Şifre en az 8 karakter olmalı.'); return
        }
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, newPassword }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Sıfırlama başarısız.')
            } else {
                setMode('reset-done')
            }
        } catch {
            setError('Bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    const errorBox = error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm border"
            style={{ background: 'var(--accent-danger-bg)', borderColor: 'var(--accent-danger-border)', color: 'var(--accent-danger)' }}>
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
        </div>
    )

    return (
        <>
            {/* ════════════ INTRO — AlienDialLoader (bir kez oynar) ════════════ */}
            <AnimatePresence>
                {showIntro && (
                    <motion.div
                        key="intro"
                        className="fixed inset-0 z-50 cursor-pointer"
                        onClick={() => setShowIntro(false)}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <AlienDialLoader loop={false} durationMs={2800} onComplete={() => setShowIntro(false)} />
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowIntro(false) }}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] text-[11px] tracking-[0.3em] uppercase text-white/45 hover:text-white/90 transition-colors"
                        >
                            Geç →
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] relative overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}>

            {/* ════════════ SOL — MARKA / HERO (lg+) ════════════ */}
            <aside className="hidden lg:flex relative flex-col justify-between p-12 xl:p-16 overflow-hidden text-white">
                {/* Gradient zemin + orblar */}
                <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))' }} />
                <div className="absolute inset-0 opacity-30"
                    style={{ background: 'radial-gradient(120% 120% at 100% 0%, rgba(255,255,255,0.18), transparent 50%)' }} />
                <div className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.20), transparent 70%)' }} />
                <div className="pointer-events-none absolute -bottom-32 -right-16 w-[460px] h-[460px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.25), transparent 70%)' }} />

                {/* Marka */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="relative z-10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-md ring-1 ring-white/20">
                        <span className="font-bold text-lg">O</span>
                    </div>
                    <div className="leading-tight">
                        <span className="font-bold text-lg tracking-tight block">OGZIE FİNANS</span>
                        <span className="text-[11px] font-medium tracking-[0.25em] uppercase text-white/70">Kontrol Merkezi</span>
                    </div>
                </motion.div>

                {/* Başlık + özellikler */}
                <div className="relative z-10 max-w-md">
                    <motion.h2
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
                        className="text-3xl xl:text-4xl font-bold tracking-tight leading-[1.15] mb-3">
                        Paranı tek ekrandan yönet.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
                        className="text-white/75 mb-9 leading-relaxed">
                        Gelir, gider, borç ve abonelik baskısını anlık gör; ödeme akışını önceden planla.
                    </motion.p>

                    <div className="space-y-4">
                        {HERO_FEATURES.map((f, i) => (
                            <motion.div key={f.title}
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.45, delay: 0.18 + i * 0.08 }}
                                className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/12 backdrop-blur-md ring-1 ring-white/15">
                                    <f.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-[15px]">{f.title}</p>
                                    <p className="text-sm text-white/65 leading-snug">{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Alt rozet */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.45 }}
                    className="relative z-10 flex items-center gap-2 text-sm text-white/70">
                    <Sparkles className="w-4 h-4" />
                    <span>Şifreli erişim · JWT oturum · Tek kullanıcı izolasyonu</span>
                </motion.div>
            </aside>

            {/* ════════════ SAĞ — FORM ════════════ */}
            <main className="relative flex items-center justify-center p-4 sm:p-8 min-h-screen lg:min-h-0">
                {/* Mobil/genel arka plan haloları */}
                <div className="pointer-events-none absolute inset-0 lg:hidden">
                    <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full opacity-20"
                        style={{ background: 'radial-gradient(circle, var(--accent-primary), transparent 70%)' }} />
                    <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-full opacity-15"
                        style={{ background: 'radial-gradient(circle, var(--accent-purple), transparent 70%)' }} />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="relative z-10 w-full max-w-sm">

                    {/* Başlık (mobilde tam marka, lg'de mod başlığı) */}
                    <div className="text-center mb-8">
                        <div className="lg:hidden w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
                            style={{ background: 'var(--accent-primary)' }}>
                            <span className="text-white font-bold text-xl">O</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                            <span className="lg:hidden">OGZIE FİNANS</span>
                            <span className="hidden lg:inline">
                                {mode === 'login' ? 'Tekrar hoş geldin' : MODE_SUBTITLE[mode]}
                            </span>
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {MODE_SUBTITLE[mode]}
                        </p>
                    </div>

                    <div className="fintech-card fintech-card-elevated p-7">

                        {/* ═══ LOGIN ═══ */}
                        {mode === 'login' && (
                            <form onSubmit={handleLogin} className="space-y-5">
                                {errorBox}

                                <div className="space-y-1.5">
                                    <label className="form-label" htmlFor="login-email">E-posta</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                            style={{ color: 'var(--text-muted)' }} />
                                        <input id="login-email" type="email" autoComplete="email"
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="ornek@ogzie.com" className="form-input pl-10" required />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="form-label" htmlFor="login-password">Şifre</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                            style={{ color: 'var(--text-muted)' }} />
                                        <input id="login-password" type={showPass ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••" className="form-input pl-10 pr-10" required />
                                        <button type="button" onClick={() => setShowPass(v => !v)}
                                            className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2"
                                            aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input type="checkbox" checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="h-4 w-4 rounded" />
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Beni hatırla
                                        </span>
                                    </label>
                                    <button type="button" onClick={() => { setMode('forgot'); setError('') }}
                                        className="text-xs font-medium hover:underline"
                                        style={{ color: 'var(--accent-primary)' }}>
                                        Şifremi unuttum
                                    </button>
                                </div>

                                <button type="submit" disabled={loading}
                                    className={cn('btn-primary w-full py-3', loading && 'opacity-70 cursor-not-allowed')}>
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Giriş yapılıyor...
                                        </span>
                                    ) : 'Giriş Yap'}
                                </button>
                            </form>
                        )}

                        {/* ═══ FORGOT ═══ */}
                        {mode === 'forgot' && (
                            <form onSubmit={handleForgot} className="space-y-5">
                                {errorBox}
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    E-posta adresinizi girin, şifre sıfırlama linki gönderelim.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="form-label" htmlFor="forgot-email">E-posta</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                                            style={{ color: 'var(--text-muted)' }} />
                                        <input id="forgot-email" type="email" autoComplete="email"
                                            value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="ornek@ogzie.com" className="form-input pl-10" required />
                                    </div>
                                </div>
                                <button type="submit" disabled={loading}
                                    className={cn('btn-primary w-full py-3', loading && 'opacity-70')}>
                                    {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                                </button>
                                <button type="button" onClick={() => { setMode('login'); setError('') }}
                                    className="text-sm w-full text-center" style={{ color: 'var(--text-muted)' }}>
                                    ← Girişe dön
                                </button>
                            </form>
                        )}

                        {/* ═══ FORGOT-SENT ═══ */}
                        {mode === 'forgot-sent' && (
                            <div className="space-y-5 text-center">
                                <div className="flex justify-center">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--accent-success-bg)' }}>
                                        <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--accent-success)' }} />
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-primary)' }}>
                                    Eğer kayıtlı bir hesap varsa, e-posta adresinize sıfırlama linki gönderildi.
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    Link 1 saat geçerlidir. Spam klasörünüzü de kontrol edin.
                                </p>
                                <button type="button" onClick={() => setMode('login')}
                                    className="btn-primary w-full py-3">
                                    Girişe Dön
                                </button>
                            </div>
                        )}

                        {/* ═══ RESET ═══ */}
                        {mode === 'reset' && (
                            <form onSubmit={handleReset} className="space-y-5">
                                {errorBox}
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Yeni şifrenizi belirleyin. En az 8 karakter.
                                </p>
                                <div className="space-y-1.5">
                                    <label className="form-label" htmlFor="new-password">Yeni Şifre</label>
                                    <input id="new-password" type="password"
                                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        className="form-input" minLength={8} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="form-label" htmlFor="confirm-password">Yeni Şifre (Tekrar)</label>
                                    <input id="confirm-password" type="password"
                                        value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                                        className="form-input" minLength={8} required />
                                </div>
                                <button type="submit" disabled={loading}
                                    className={cn('btn-primary w-full py-3', loading && 'opacity-70')}>
                                    {loading ? 'Sıfırlanıyor...' : 'Şifreyi Güncelle'}
                                </button>
                            </form>
                        )}

                        {/* ═══ RESET-DONE ═══ */}
                        {mode === 'reset-done' && (
                            <div className="space-y-5 text-center">
                                <div className="flex justify-center">
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--accent-success-bg)' }}>
                                        <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--accent-success)' }} />
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-primary)' }}>
                                    Şifreniz başarıyla güncellendi.
                                </p>
                                <a href="/login" className="btn-primary w-full py-3 inline-flex items-center justify-center">
                                    Giriş Yap
                                </a>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="mt-5 pt-5 flex items-center justify-center gap-3 text-xs flex-wrap"
                                style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Şifreli erişim
                                </span>
                                <span>•</span>
                                <span>JWT oturum</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
        </>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />}>
            <LoginInner />
        </Suspense>
    )
}
