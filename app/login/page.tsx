'use client'

import { Suspense, useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'forgot' | 'reset' | 'forgot-sent' | 'reset-done'

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

    useEffect(() => {
        if (resetToken) setMode('reset')
    }, [resetToken])

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

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}>

            {/* Arka plan haloları */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, var(--accent-primary), transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, var(--accent-purple), transparent 70%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
                        style={{ background: 'var(--accent-primary)' }}>
                        <span className="text-white font-bold text-xl">O</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        OGZIE FİNANS
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {mode === 'login' ? 'Kişisel finans kontrol merkezi' : ''}
                        {mode === 'forgot' && 'Şifre sıfırlama'}
                        {mode === 'forgot-sent' && 'E-posta gönderildi'}
                        {mode === 'reset' && 'Yeni şifre belirleyin'}
                        {mode === 'reset-done' && 'Şifre güncellendi'}
                    </p>
                </div>

                <div className="fintech-card fintech-card-elevated p-7">

                    {/* ═══ LOGIN ═══ */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm border"
                                    style={{ background: 'var(--accent-danger-bg)', borderColor: 'var(--accent-danger-border)', color: 'var(--accent-danger)' }}>
                                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

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
                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm border"
                                    style={{ background: 'var(--accent-danger-bg)', borderColor: 'var(--accent-danger-border)', color: 'var(--accent-danger)' }}>
                                    <span>{error}</span>
                                </div>
                            )}
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
                            {error && (
                                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm border"
                                    style={{ background: 'var(--accent-danger-bg)', borderColor: 'var(--accent-danger-border)', color: 'var(--accent-danger)' }}>
                                    <span>{error}</span>
                                </div>
                            )}
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
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />}>
            <LoginInner />
        </Suspense>
    )
}
