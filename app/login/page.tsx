'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
    const [email, setEmail]           = useState('')
    const [password, setPassword]     = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPass, setShowPass]     = useState(false)
    const [loading, setLoading]       = useState(false)
    const [error, setError]           = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                rememberMe: String(rememberMe),
                redirect: false,
            })

            if (result?.error) {
                if (result.error.startsWith('LOCKED:')) {
                    const min = result.error.split(':')[1]
                    setError(`Çok fazla başarısız deneme. Hesabınız ${min} dakika kilitli.`)
                } else if (result.error.startsWith('ATTEMPTS:')) {
                    const left = result.error.split(':')[1]
                    setError(`Hatalı şifre. ${left} deneme hakkınız kaldı.`)
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

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
        >
            {/* Arka plan haloları */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, var(--accent-primary), transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, var(--accent-purple), transparent 70%)' }} />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo & başlık */}
                <div className="text-center mb-8">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl"
                        style={{ background: 'var(--accent-primary)' }}
                    >
                        <span className="text-white font-bold text-xl">O</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        OGZIE FİNANS
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Kişisel finans kontrol merkezinize giriş yapın
                    </p>
                </div>

                {/* Kart */}
                <div className="fintech-card fintech-card-elevated p-7">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Hata */}
                        {error && (
                            <div
                                className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm border"
                                style={{
                                    background: 'var(--accent-danger-bg)',
                                    borderColor: 'var(--accent-danger-border)',
                                    color: 'var(--accent-danger)',
                                }}
                                role="alert"
                            >
                                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* E-posta */}
                        <div className="space-y-1.5">
                            <label className="form-label" htmlFor="login-email">E-posta</label>
                            <div className="relative">
                                <Mail
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                    style={{ color: 'var(--text-muted)' }}
                                />
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="ornek@ogzie.com"
                                    className="form-input pl-10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Şifre */}
                        <div className="space-y-1.5">
                            <label className="form-label" htmlFor="login-password">Şifre</label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                    style={{ color: 'var(--text-muted)' }}
                                />
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="form-input pl-10 pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="btn-icon absolute right-1.5 top-1/2 -translate-y-1/2"
                                    aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                                >
                                    {showPass
                                        ? <EyeOff className="w-4 h-4" />
                                        : <Eye className="w-4 h-4" />
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Beni hatırla */}
                        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                    className="sr-only peer"
                                    id="remember-me"
                                />
                                <div
                                    className="w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all peer-checked:border-0"
                                    style={{
                                        borderColor: rememberMe ? 'transparent' : 'var(--border-hover)',
                                        background: rememberMe ? 'var(--accent-primary)' : 'transparent',
                                        width: '1.125rem',
                                        height: '1.125rem',
                                    }}
                                >
                                    {rememberMe && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Beni hatırla
                                <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(30 gün)</span>
                            </span>
                        </label>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn('btn-primary w-full py-3', loading && 'opacity-70 cursor-not-allowed')}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Giriş yapılıyor...
                                </span>
                            ) : 'Giriş Yap'}
                        </button>
                    </form>

                    <div className="mt-5 pt-5 flex items-center justify-center gap-4 text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Şifreli erişim
                        </span>
                        <span>•</span>
                        <span>Çok kullanıcılı izolasyon</span>
                        <span>•</span>
                        <span>JWT oturum</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
