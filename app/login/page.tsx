'use client'

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

/* ============================================================
   Animated eye-tracking characters (adapted from
   components/ui/animated-characters-login-page.tsx).

   Perf: a SINGLE requestAnimationFrame-throttled mouse store feeds
   every eye/character (one window listener, capped at ~display
   refresh) instead of one listener + setState-per-event per eye.
   Mouse-follow is applied via `transform: translate` (compositor-
   friendly) rather than animating `left/top` (which forces layout
   every frame). Positions are read from getBoundingClientRect during
   render on purpose — each render is now driven by the throttled
   store — which trips react-hooks/refs, disabled for this file.
   ============================================================ */
/* eslint-disable react-hooks/refs */

// --- Shared rAF-throttled mouse position (one listener for the whole scene) ---
const mouseStore = (() => {
    let snapshot = { x: 0, y: 0 }
    let pendingX = 0
    let pendingY = 0
    let rafId = 0
    let attached = false
    const subs = new Set<() => void>()

    const flush = () => {
        rafId = 0
        snapshot = { x: pendingX, y: pendingY }
        subs.forEach((s) => s())
    }
    const onMove = (e: MouseEvent) => {
        pendingX = e.clientX
        pendingY = e.clientY
        if (!rafId) rafId = requestAnimationFrame(flush)
    }
    return {
        subscribe(cb: () => void) {
            subs.add(cb)
            if (!attached && typeof window !== 'undefined') {
                window.addEventListener('mousemove', onMove)
                attached = true
            }
            return () => {
                subs.delete(cb)
                if (subs.size === 0 && attached) {
                    window.removeEventListener('mousemove', onMove)
                    attached = false
                    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
                }
            }
        },
        getSnapshot: () => snapshot,
        getServerSnapshot: () => snapshot,
    }
})()

function useMouse() {
    return useSyncExternalStore(mouseStore.subscribe, mouseStore.getSnapshot, mouseStore.getServerSnapshot)
}

interface PupilProps {
    size?: number
    maxDistance?: number
    pupilColor?: string
    forceLookX?: number
    forceLookY?: number
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = 'black', forceLookX, forceLookY }: PupilProps) => {
    const { x: mouseX, y: mouseY } = useMouse()
    const pupilRef = useRef<HTMLDivElement>(null)

    const calc = () => {
        if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
        if (!pupilRef.current) return { x: 0, y: 0 }
        const p = pupilRef.current.getBoundingClientRect()
        const cx = p.left + p.width / 2
        const cy = p.top + p.height / 2
        const dx = mouseX - cx
        const dy = mouseY - cy
        const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance)
        const angle = Math.atan2(dy, dx)
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
    }

    const pos = calc()

    return (
        <div
            ref={pupilRef}
            className="rounded-full"
            style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: pupilColor,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: 'transform 0.1s ease-out',
                willChange: 'transform',
            }}
        />
    )
}

interface EyeBallProps {
    size?: number
    pupilSize?: number
    maxDistance?: number
    eyeColor?: string
    pupilColor?: string
    isBlinking?: boolean
    forceLookX?: number
    forceLookY?: number
}

const EyeBall = ({
    size = 48, pupilSize = 16, maxDistance = 10, eyeColor = 'white',
    pupilColor = 'black', isBlinking = false, forceLookX, forceLookY,
}: EyeBallProps) => {
    const { x: mouseX, y: mouseY } = useMouse()
    const eyeRef = useRef<HTMLDivElement>(null)

    const calc = () => {
        if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
        if (!eyeRef.current) return { x: 0, y: 0 }
        const eye = eyeRef.current.getBoundingClientRect()
        const cx = eye.left + eye.width / 2
        const cy = eye.top + eye.height / 2
        const dx = mouseX - cx
        const dy = mouseY - cy
        const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance)
        const angle = Math.atan2(dy, dx)
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
    }

    const pos = calc()

    return (
        <div
            ref={eyeRef}
            className="rounded-full flex items-center justify-center transition-all duration-150"
            style={{ width: `${size}px`, height: isBlinking ? '2px' : `${size}px`, backgroundColor: eyeColor, overflow: 'hidden' }}
        >
            {!isBlinking && (
                <div
                    className="rounded-full"
                    style={{
                        width: `${pupilSize}px`,
                        height: `${pupilSize}px`,
                        backgroundColor: pupilColor,
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                        transition: 'transform 0.1s ease-out',
                        willChange: 'transform',
                    }}
                />
            )}
        </div>
    )
}

interface CharacterSceneProps {
    isTyping: boolean
    showPassword: boolean
    passwordLength: number
}

/** The four eye-tracking characters. Reacts to typing / password visibility. */
function CharacterScene({ isTyping, showPassword, passwordLength }: CharacterSceneProps) {
    const { x: mouseX, y: mouseY } = useMouse()
    const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
    const [isBlackBlinking, setIsBlackBlinking] = useState(false)
    const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
    const [isPurplePeeking, setIsPurplePeeking] = useState(false)
    const purpleRef = useRef<HTMLDivElement>(null)
    const blackRef = useRef<HTMLDivElement>(null)
    const yellowRef = useRef<HTMLDivElement>(null)
    const orangeRef = useRef<HTMLDivElement>(null)

    // Random blink — purple
    useEffect(() => {
        const rnd = () => Math.random() * 4000 + 3000
        const schedule = (): ReturnType<typeof setTimeout> =>
            setTimeout(() => {
                setIsPurpleBlinking(true)
                setTimeout(() => { setIsPurpleBlinking(false); timeout = schedule() }, 150)
            }, rnd())
        let timeout = schedule()
        return () => clearTimeout(timeout)
    }, [])

    // Random blink — black
    useEffect(() => {
        const rnd = () => Math.random() * 4000 + 3000
        const schedule = (): ReturnType<typeof setTimeout> =>
            setTimeout(() => {
                setIsBlackBlinking(true)
                setTimeout(() => { setIsBlackBlinking(false); timeout = schedule() }, 150)
            }, rnd())
        let timeout = schedule()
        return () => clearTimeout(timeout)
    }, [])

    // Glance at each other when typing starts
    useEffect(() => {
        if (isTyping) {
            setIsLookingAtEachOther(true)
            const t = setTimeout(() => setIsLookingAtEachOther(false), 800)
            return () => clearTimeout(t)
        }
        setIsLookingAtEachOther(false)
    }, [isTyping])

    // Purple sneaky peek when password is revealed
    useEffect(() => {
        if (passwordLength > 0 && showPassword) {
            const t = setTimeout(() => {
                setIsPurplePeeking(true)
                setTimeout(() => setIsPurplePeeking(false), 800)
            }, Math.random() * 3000 + 2000)
            return () => clearTimeout(t)
        }
        setIsPurplePeeking(false)
    }, [passwordLength, showPassword, isPurplePeeking])

    const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 }
        const rect = ref.current.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 3
        const dx = mouseX - cx
        const dy = mouseY - cy
        return {
            faceX: Math.max(-15, Math.min(15, dx / 20)),
            faceY: Math.max(-10, Math.min(10, dy / 30)),
            bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
        }
    }

    const purplePos = calcPos(purpleRef)
    const blackPos = calcPos(blackRef)
    const yellowPos = calcPos(yellowRef)
    const orangePos = calcPos(orangeRef)

    const hidden = passwordLength > 0 && !showPassword
    const revealed = passwordLength > 0 && showPassword
    // mouse-follow via transform (composited) only while freely tracking
    const tracking = !revealed && !isLookingAtEachOther
    const follow = (x: number, y: number) => `translate(${x}px, ${y}px)`

    return (
        <div className="relative" style={{ width: '550px', height: '400px' }}>
            {/* Purple — back layer */}
            <div
                ref={purpleRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                    left: '70px',
                    width: '180px',
                    height: (isTyping || hidden) ? '440px' : '400px',
                    backgroundColor: '#6C3FF5',
                    borderRadius: '10px 10px 0 0',
                    zIndex: 1,
                    transform: revealed
                        ? 'skewX(0deg)'
                        : (isTyping || hidden)
                            ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                            : `skewX(${purplePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                    willChange: 'transform',
                }}
            >
                <div
                    className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                    style={{
                        left: revealed ? '20px' : isLookingAtEachOther ? '55px' : '45px',
                        top: revealed ? '35px' : isLookingAtEachOther ? '65px' : '40px',
                        transform: tracking ? follow(purplePos.faceX, purplePos.faceY) : 'translate(0px, 0px)',
                        willChange: 'transform',
                    }}
                >
                    <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
                        isBlinking={isPurpleBlinking}
                        forceLookX={revealed ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                        forceLookY={revealed ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                    <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
                        isBlinking={isPurpleBlinking}
                        forceLookX={revealed ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                        forceLookY={revealed ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                </div>
            </div>

            {/* Black — middle layer */}
            <div
                ref={blackRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                    left: '240px',
                    width: '120px',
                    height: '310px',
                    backgroundColor: '#2D2D2D',
                    borderRadius: '8px 8px 0 0',
                    zIndex: 2,
                    transform: revealed
                        ? 'skewX(0deg)'
                        : isLookingAtEachOther
                            ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                            : (isTyping || hidden)
                                ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                                : `skewX(${blackPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                    willChange: 'transform',
                }}
            >
                <div
                    className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                    style={{
                        left: revealed ? '10px' : isLookingAtEachOther ? '32px' : '26px',
                        top: revealed ? '28px' : isLookingAtEachOther ? '12px' : '32px',
                        transform: tracking ? follow(blackPos.faceX, blackPos.faceY) : 'translate(0px, 0px)',
                        willChange: 'transform',
                    }}
                >
                    <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
                        isBlinking={isBlackBlinking}
                        forceLookX={revealed ? -4 : isLookingAtEachOther ? 0 : undefined}
                        forceLookY={revealed ? -4 : isLookingAtEachOther ? -4 : undefined} />
                    <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
                        isBlinking={isBlackBlinking}
                        forceLookX={revealed ? -4 : isLookingAtEachOther ? 0 : undefined}
                        forceLookY={revealed ? -4 : isLookingAtEachOther ? -4 : undefined} />
                </div>
            </div>

            {/* Orange — front left */}
            <div
                ref={orangeRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                    left: '0px',
                    width: '240px',
                    height: '200px',
                    zIndex: 3,
                    backgroundColor: '#FF9B6B',
                    borderRadius: '120px 120px 0 0',
                    transform: revealed ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                    willChange: 'transform',
                }}
            >
                <div
                    className="absolute flex gap-8 transition-all duration-200 ease-out"
                    style={{
                        left: revealed ? '50px' : '82px',
                        top: revealed ? '85px' : '90px',
                        transform: revealed ? 'translate(0px, 0px)' : follow(orangePos.faceX || 0, orangePos.faceY || 0),
                        willChange: 'transform',
                    }}
                >
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={revealed ? -5 : undefined} forceLookY={revealed ? -4 : undefined} />
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={revealed ? -5 : undefined} forceLookY={revealed ? -4 : undefined} />
                </div>
            </div>

            {/* Yellow — front right */}
            <div
                ref={yellowRef}
                className="absolute bottom-0 transition-all duration-700 ease-in-out"
                style={{
                    left: '310px',
                    width: '140px',
                    height: '230px',
                    backgroundColor: '#E8D754',
                    borderRadius: '70px 70px 0 0',
                    zIndex: 4,
                    transform: revealed ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew || 0}deg)`,
                    transformOrigin: 'bottom center',
                    willChange: 'transform',
                }}
            >
                <div
                    className="absolute flex gap-6 transition-all duration-200 ease-out"
                    style={{
                        left: revealed ? '20px' : '52px',
                        top: revealed ? '35px' : '40px',
                        transform: revealed ? 'translate(0px, 0px)' : follow(yellowPos.faceX || 0, yellowPos.faceY || 0),
                        willChange: 'transform',
                    }}
                >
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={revealed ? -5 : undefined} forceLookY={revealed ? -4 : undefined} />
                    <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={revealed ? -5 : undefined} forceLookY={revealed ? -4 : undefined} />
                </div>
                <div
                    className="absolute w-20 h-[4px] rounded-full transition-all duration-200 ease-out"
                    style={{
                        backgroundColor: '#2D2D2D',
                        left: revealed ? '10px' : '40px',
                        top: '88px',
                        transform: revealed ? 'translate(0px, 0px)' : follow(yellowPos.faceX || 0, yellowPos.faceY || 0),
                        willChange: 'transform',
                    }}
                />
            </div>
        </div>
    )
}

/* ============================================================
   Login page — animated design wired to real NextAuth auth.
   ============================================================ */

type Mode = 'login' | 'forgot' | 'reset' | 'forgot-sent' | 'reset-done'

const MODE_SUBTITLE: Record<Mode, string> = {
    'login': 'Kişisel finans kontrol merkezi',
    'forgot': 'Şifre sıfırlama',
    'forgot-sent': 'E-posta gönderildi',
    'reset': 'Yeni şifre belirleyin',
    'reset-done': 'Şifre güncellendi',
}

function LoginInner() {
    const params = useSearchParams()
    const resetToken = params.get('reset')

    const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPass, setConfirmPass] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isTyping, setIsTyping] = useState(false)

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
        if (newPassword !== confirmPass) { setError('Yeni şifreler eşleşmiyor.'); return }
        if (newPassword.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return }
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
        <div
            className="flex items-start gap-2.5 p-3.5 rounded-lg text-sm border"
            style={{ background: 'var(--accent-danger-bg)', borderColor: 'var(--accent-danger-border)', color: 'var(--accent-danger)' }}
        >
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
        </div>
    )

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* ══ Sol — Marka + animasyonlu karakterler ══ */}
            <div
                className="relative hidden lg:flex flex-col justify-between p-12 text-primary-foreground overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-purple))' }}
            >
                <div className="relative z-20">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center">
                            <span className="font-bold text-lg">O</span>
                        </div>
                        <div className="leading-tight">
                            <span className="font-bold text-lg tracking-tight block">OGZIE FİNANS</span>
                            <span className="text-[11px] font-medium tracking-[0.25em] uppercase text-white/70">Kontrol Merkezi</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-20 flex items-end justify-center h-[500px]">
                    <CharacterScene isTyping={isTyping} showPassword={showPass} passwordLength={password.length} />
                </div>

                <div className="relative z-20 flex items-center gap-2 text-sm text-white/70">
                    <Sparkles className="w-4 h-4" />
                    <span>Şifreli erişim · JWT oturum · Tek kullanıcı izolasyonu</span>
                </div>

                {/* Dekoratif haloler */}
                <div className="pointer-events-none absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
                <div className="pointer-events-none absolute bottom-1/4 left-1/4 size-96 bg-black/10 rounded-full blur-3xl" />
            </div>

            {/* ══ Sağ — Form ══ */}
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-[420px]">
                    {/* Mobil logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
                        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
                            <span className="text-white font-bold">O</span>
                        </div>
                        <span>OGZIE FİNANS</span>
                    </div>

                    {/* Başlık */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                            {mode === 'login' ? 'Tekrar hoş geldin' : MODE_SUBTITLE[mode]}
                        </h1>
                        <p className="text-muted-foreground text-sm">{MODE_SUBTITLE[mode]}</p>
                    </div>

                    {/* ═══ LOGIN ═══ */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-5">
                            {errorBox}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">E-posta</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="ornek@ogzie.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setIsTyping(true)}
                                    onBlur={() => setIsTyping(false)}
                                    required
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">Şifre</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPass ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setIsTyping(true)}
                                        onBlur={() => setIsTyping(false)}
                                        required
                                        className="h-12 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPass ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(v) => setRememberMe(v === true)}
                                    />
                                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                        Beni hatırla
                                    </Label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setMode('forgot'); setError('') }}
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    Şifremi unuttum
                                </button>
                            </div>

                            <Button type="submit" className="w-full h-12 text-base font-medium" size="lg" disabled={loading}>
                                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                            </Button>

                            <div
                                className="mt-1 pt-5 flex items-center justify-center gap-3 text-xs flex-wrap text-muted-foreground"
                                style={{ borderTop: '1px solid var(--border-default)' }}
                            >
                                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Şifreli erişim</span>
                                <span>•</span>
                                <span>JWT oturum</span>
                            </div>
                        </form>
                    )}

                    {/* ═══ FORGOT ═══ */}
                    {mode === 'forgot' && (
                        <form onSubmit={handleForgot} className="space-y-5">
                            {errorBox}
                            <p className="text-sm text-muted-foreground">
                                E-posta adresinizi girin, şifre sıfırlama linki gönderelim.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email" className="text-sm font-medium">E-posta</Label>
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="ornek@ogzie.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-medium" size="lg" disabled={loading}>
                                {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                            </Button>
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError('') }}
                                className="text-sm w-full text-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Girişe dön
                            </button>
                        </form>
                    )}

                    {/* ═══ FORGOT-SENT ═══ */}
                    {mode === 'forgot-sent' && (
                        <div className="space-y-5 text-center">
                            <div className="flex justify-center">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-success-bg)' }}>
                                    <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--accent-success)' }} />
                                </div>
                            </div>
                            <p className="text-foreground">
                                Eğer kayıtlı bir hesap varsa, e-posta adresinize sıfırlama linki gönderildi.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Link 1 saat geçerlidir. Spam klasörünüzü de kontrol edin.
                            </p>
                            <Button type="button" onClick={() => setMode('login')} className="w-full h-12 text-base font-medium" size="lg">
                                Girişe Dön
                            </Button>
                        </div>
                    )}

                    {/* ═══ RESET ═══ */}
                    {mode === 'reset' && (
                        <form onSubmit={handleReset} className="space-y-5">
                            {errorBox}
                            <p className="text-sm text-muted-foreground">Yeni şifrenizi belirleyin. En az 8 karakter.</p>
                            <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-sm font-medium">Yeni Şifre</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={8}
                                    required
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-sm font-medium">Yeni Şifre (Tekrar)</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    minLength={8}
                                    required
                                    className="h-12"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 text-base font-medium" size="lg" disabled={loading}>
                                {loading ? 'Sıfırlanıyor...' : 'Şifreyi Güncelle'}
                            </Button>
                        </form>
                    )}

                    {/* ═══ RESET-DONE ═══ */}
                    {mode === 'reset-done' && (
                        <div className="space-y-5 text-center">
                            <div className="flex justify-center">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-success-bg)' }}>
                                    <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--accent-success)' }} />
                                </div>
                            </div>
                            <p className="text-foreground">Şifreniz başarıyla güncellendi.</p>
                            <a href="/login" className="inline-flex w-full">
                                <Button type="button" className="w-full h-12 text-base font-medium" size="lg">Giriş Yap</Button>
                            </a>
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
