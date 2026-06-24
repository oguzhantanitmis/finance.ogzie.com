'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

export interface AlienDialLoaderProps {
    /** Kadran çapı. Sayı → px, string → birebir (varsayılan "60vmin"). */
    size?: number | string
    /** Çekirdek/glow rengi (varsayılan emerald). */
    primaryColor?: string
    /** Tek sefer modunda toplam süre + flash temposu (ms). */
    durationMs?: number
    /** true → sonsuz döngü, false → bir kez oynayıp onComplete çağırır. */
    loop?: boolean
    /** loop=false iken sekans bitince tetiklenir. */
    onComplete?: () => void
    className?: string
}

// SVG viewBox 0..100, merkez (50,50). Sabit (deterministik) geometriler:
const TICKS = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2
    const major = i % 5 === 0
    const r1 = major ? 40.5 : 43.5
    const r2 = 47.5
    return {
        x1: 50 + r1 * Math.cos(a), y1: 50 + r1 * Math.sin(a),
        x2: 50 + r2 * Math.cos(a), y2: 50 + r2 * Math.sin(a),
        major,
    }
})

const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2
    return `${50 + 27 * Math.cos(a)},${50 + 27 * Math.sin(a)}`
}).join(' ')

/**
 * AlienDialLoader — tam ekran, alien bileklik cihazı kadranı yükleme/intro
 * animasyonu. Saf CSS/SVG + Framer Motion; dış varlık yok. Yalnızca
 * transform/opacity (GPU dostu). prefers-reduced-motion'da dönüş/flash kapanır,
 * statik glow kalır.
 */
export default function AlienDialLoader({
    size = '60vmin',
    primaryColor = '#34d399',
    durationMs = 3200,
    loop = true,
    onComplete,
    className = '',
}: AlienDialLoaderProps) {
    const reduce = useReducedMotion()
    const dim = typeof size === 'number' ? `${size}px` : size
    const animated = loop && !reduce
    const flashGap = Math.max(1.4, durationMs / 1000 - 1.1)

    // Tek sefer (loop=false) modunda sekans bitince haber ver.
    useEffect(() => {
        if (loop || !onComplete) return
        const t = setTimeout(onComplete, reduce ? 600 : durationMs)
        return () => clearTimeout(t)
    }, [loop, onComplete, durationMs, reduce])

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${className}`}
            style={{ background: 'radial-gradient(circle at 50% 45%, #0c1311 0%, #050807 55%, #000 100%)' }}
            aria-hidden="true"
        >
            {/* Tarama çizgileri (scanlines) */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)' }}
            />

            {/* Kadran */}
            <div className="relative" style={{ width: dim, height: dim, minWidth: '240px', minHeight: '240px' }}>

                {/* Bloom / glow (nabız) */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        inset: '-18%',
                        background: `radial-gradient(circle, ${primaryColor}66 0%, ${primaryColor}22 35%, transparent 70%)`,
                        filter: 'blur(8px)',
                    }}
                    initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                    animate={reduce
                        ? { opacity: 0.85 }
                        : { opacity: [0.55, 0.9, 0.55], scale: [0.96, 1.04, 0.96] }}
                    transition={reduce ? { duration: 0.6 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Metalik bezel */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'radial-gradient(circle at 50% 32%, #2b3331 0%, #161b1a 46%, #0a0d0c 78%)',
                        boxShadow: `inset 0 2px 6px rgba(255,255,255,0.10), inset 0 -10px 30px rgba(0,0,0,0.8), 0 12px 50px rgba(0,0,0,0.7), 0 0 0 1px ${primaryColor}22`,
                    }}
                />
                <div className="absolute rounded-full" style={{ inset: '6%', background: 'radial-gradient(circle at 50% 40%, #0e1413 0%, #060908 80%)', boxShadow: `inset 0 0 40px rgba(0,0,0,0.9), inset 0 0 0 1px ${primaryColor}33` }} />

                {/* Dış halka — tik işaretleri (saat yönünde) */}
                <motion.svg
                    viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"
                    style={{ transformOrigin: '50% 50%' }}
                    animate={animated ? { rotate: 360 } : { rotate: 0 }}
                    transition={animated ? { duration: 24, repeat: Infinity, ease: 'linear' } : undefined}
                >
                    {TICKS.map((t, i) => (
                        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                            stroke={primaryColor}
                            strokeWidth={t.major ? 0.9 : 0.45}
                            strokeLinecap="round"
                            opacity={t.major ? 0.9 : 0.4} />
                    ))}
                </motion.svg>

                {/* Orta halka — segmentli (ters yön) */}
                <motion.svg
                    viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"
                    style={{ transformOrigin: '50% 50%' }}
                    animate={animated ? { rotate: -360 } : { rotate: 0 }}
                    transition={animated ? { duration: 16, repeat: Infinity, ease: 'linear' } : undefined}
                >
                    <circle cx="50" cy="50" r="36" fill="none" stroke={primaryColor} strokeWidth="0.8"
                        strokeDasharray="3 4" opacity="0.55" />
                    <polygon points={HEX_POINTS} fill="none" stroke={primaryColor} strokeWidth="0.7" opacity="0.5" />
                </motion.svg>

                {/* İç hex halka (yavaş, saat yönünde) */}
                <motion.svg
                    viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"
                    style={{ transformOrigin: '50% 50%' }}
                    animate={animated ? { rotate: 360 } : { rotate: 0 }}
                    transition={animated ? { duration: 40, repeat: Infinity, ease: 'linear' } : undefined}
                >
                    <circle cx="50" cy="50" r="20" fill="none" stroke={primaryColor} strokeWidth="0.5"
                        strokeDasharray="1.5 3" opacity="0.5" />
                </motion.svg>

                {/* Çekirdek (power-on: spring ile büyür + parlar) */}
                <motion.div
                    className="absolute left-1/2 top-1/2 rounded-full"
                    style={{
                        width: '26%', height: '26%', x: '-50%', y: '-50%',
                        background: `radial-gradient(circle at 50% 38%, #ffffff 0%, ${primaryColor} 34%, ${primaryColor} 62%, ${primaryColor}00 78%)`,
                        boxShadow: `0 0 30px ${primaryColor}, 0 0 70px ${primaryColor}cc, 0 0 130px ${primaryColor}88`,
                    }}
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={reduce
                        ? { scale: 1, opacity: 1 }
                        : { scale: [0, 1.05, 1, 1.04, 1], opacity: 1 }}
                    transition={reduce
                        ? { duration: 0.5 }
                        : { scale: { duration: 2.6, times: [0, 0.18, 0.4, 0.7, 1], repeat: animated ? Infinity : 0, ease: 'easeInOut' }, opacity: { type: 'spring', stiffness: 120, damping: 14 } }}
                />

                {/* Dönüşüm flash'ı (white → green, çekirdekten genişler) */}
                {animated && (
                    <motion.div
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                            width: '26%', height: '26%', x: '-50%', y: '-50%',
                            background: `radial-gradient(circle, #ffffff 0%, ${primaryColor} 45%, ${primaryColor}00 70%)`,
                        }}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: [0.4, 3.6], opacity: [0, 0.95, 0] }}
                        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: flashGap, ease: 'easeOut', times: [0, 0.35, 1] }}
                    />
                )}

                {/* loop=false: tek seferlik flash */}
                {!animated && !reduce && (
                    <motion.div
                        className="absolute left-1/2 top-1/2 rounded-full"
                        style={{
                            width: '26%', height: '26%', x: '-50%', y: '-50%',
                            background: `radial-gradient(circle, #ffffff 0%, ${primaryColor} 45%, ${primaryColor}00 70%)`,
                        }}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: [0.4, 3.6], opacity: [0, 0.95, 0] }}
                        transition={{ duration: 1.2, delay: Math.max(0.6, durationMs / 1000 - 1.4), ease: 'easeOut', times: [0, 0.35, 1] }}
                    />
                )}
            </div>
        </div>
    )
}
