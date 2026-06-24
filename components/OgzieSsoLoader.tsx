'use client'

/**
 * OgzieSsoLoader — "ogzie ile giriş yapılıyor…" tam ekran yükleme/animasyon
 * şablonu. TAŞINABİLİR: projeye özel CSS class'ı veya token'ı zorunlu DEĞİL.
 *
 * Bağımlılıklar: react, framer-motion, lucide-react. (Tek dosya — başka
 * sistemlere kopyala-yapıştır ile eklenebilir; mesai360 vb.)
 *
 * Renk varsayılanları CSS değişkenini fallback ile kullanır:
 *   var(--accent-primary, #6366f1) → token'a sahip uygulamalar otomatik
 *   temalanır; olmayanlar fallback'i alır. İstersen prop ile override et.
 *
 * Kullanım (auth mantığını host sağlar):
 *   <OgzieSsoLoader state={error ? 'error' : 'loading'} />
 *   <OgzieSsoLoader primaryColor="#16a34a" brandInitial="M" message="mesai360'a giriş yapılıyor…" />
 */

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

export interface OgzieSsoLoaderProps {
    /** 'loading' (varsayılan) ya da 'error'. */
    state?: 'loading' | 'error'
    /** Yükleme metni. */
    message?: string
    /** Hata başlığı ve açıklaması. */
    errorTitle?: string
    errorMessage?: string
    /** Hata ekranındaki dönüş bağlantısı. */
    returnHref?: string
    returnLabel?: string
    /** Logo tile içindeki marka harfi (brandLogo verilirse yok sayılır). */
    brandInitial?: string
    /** Özel logo düğümü (initial yerine; kendi <img>/SVG'ni geçebilirsin). */
    brandLogo?: ReactNode
    /** Renkler — varsayılanlar host token'larını otomatik kullanır, yoksa fallback. */
    primaryColor?: string
    secondaryColor?: string
    background?: string
    textPrimary?: string
    textMuted?: string
    dangerColor?: string
    dangerBg?: string
    /** true (varsayılan) → fixed inset-0 tam ekran + arka plan haloları.
     *  false → yalnız ortalanmış içerik (kendi kapsayıcına gömmek için). */
    fullScreen?: boolean
    className?: string
}

export default function OgzieSsoLoader({
    state = 'loading',
    message = 'ogzie ile giriş yapılıyor…',
    errorTitle = 'ogzie ile giriş başarısız',
    errorMessage = 'Bağlantı geçersiz veya süresi dolmuş olabilir. Lütfen tekrar deneyin.',
    returnHref = '/login',
    returnLabel = 'Giriş sayfasına dön',
    brandInitial = 'O',
    brandLogo,
    primaryColor = 'var(--accent-primary, #6366f1)',
    secondaryColor = 'var(--accent-purple, #a78bfa)',
    background = 'var(--bg-primary, #0a0a0a)',
    textPrimary = 'var(--text-primary, #fafafa)',
    textMuted = 'var(--text-muted, #a1a1aa)',
    dangerColor = 'var(--accent-danger, #f87171)',
    dangerBg = 'var(--accent-danger-bg, rgba(248,113,113,0.12))',
    fullScreen = true,
    className = '',
}: OgzieSsoLoaderProps) {
    const content = state === 'error' ? (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-6 max-w-sm px-6 text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: dangerBg, color: dangerColor }}
            >
                <AlertCircle className="w-8 h-8" />
            </motion.div>
            <div className="space-y-2">
                <h1 className="text-xl font-bold" style={{ color: textPrimary }}>{errorTitle}</h1>
                <p className="text-sm" style={{ color: textMuted }}>{errorMessage}</p>
            </div>
            <a
                href={returnHref}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: primaryColor }}
            >
                {returnLabel}
            </a>
        </motion.div>
    ) : (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-8"
        >
            {/* Markalı logo + nabız glow */}
            <div className="relative">
                {brandLogo ?? (
                    <>
                        <motion.div
                            className="absolute inset-0 rounded-2xl blur-2xl"
                            style={{ background: primaryColor }}
                            animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.55, 0.25] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <div
                            className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden"
                            style={{ background: primaryColor }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            <span className="relative z-10 text-white font-bold text-3xl">{brandInitial}</span>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col items-center gap-4">
                {/* Zıplayan noktalar */}
                <div className="flex items-center justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: primaryColor }}
                            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                        />
                    ))}
                </div>
                <motion.p
                    className="text-sm font-medium"
                    style={{ color: textMuted }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    {message}
                </motion.p>
            </div>
        </motion.div>
    )

    if (!fullScreen) {
        return <div className={`relative flex items-center justify-center ${className}`}>{content}</div>
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${className}`}
            style={{ background }}
        >
            {/* Arka plan haloları */}
            <div className="pointer-events-none absolute inset-0">
                <div
                    className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full opacity-20"
                    style={{ background: `radial-gradient(circle, ${primaryColor}, transparent 70%)` }}
                />
                <div
                    className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full opacity-15"
                    style={{ background: `radial-gradient(circle, ${secondaryColor}, transparent 70%)` }}
                />
            </div>
            <div className="relative z-10">{content}</div>
        </div>
    )
}
