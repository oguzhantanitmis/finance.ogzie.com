'use client'

import React, { useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { HelpCircle, Star } from 'lucide-react'

interface CreditCardVisualProps {
    card: {
        cardName: string
        bankName: string
        last4Digits: string
        cardNetwork: string
        color: string
        cardProgram?: string | null
        rewardsPoints?: number
        contractualRate?: number
        defaultRate?: number
        cutOffDay?: number
        paymentDueDay?: number
    }
    flippable?: boolean
    className?: string
}

export default function CreditCardVisual({ card, flippable = false, className = '' }: CreditCardVisualProps) {
    const [isFlipped, setIsFlipped] = useState(false)

    // Motion values for 3D Tilt effect
    const x = useMotionValue(0.5)
    const y = useMotionValue(0.5)

    const rotateX = useSpring(useTransform(y, [0, 1], [15, -15]), { damping: 20, stiffness: 200 })
    const rotateY = useSpring(useTransform(x, [0, 1], [-15, 15]), { damping: 20, stiffness: 200 })

    function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        x.set(mouseX / width)
        y.set(mouseY / height)
    }

    function handleMouseLeave() {
        x.set(0.5)
        y.set(0.5)
    }

    const cardBgColor = card.color || '#6366F1'

    const renderCardNetwork = () => {
        const net = card.cardNetwork?.toUpperCase()
        if (net === 'MASTERCARD') {
            return (
                <svg className="h-8 w-12" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="7" cy="8" r="7" fill="#EB001B" opacity="0.9" />
                    <circle cx="17" cy="8" r="7" fill="#F79E1B" opacity="0.9" />
                    <path d="M12 11.4c-.8-.6-1.3-1.6-1.3-2.6S11.2 6.8 12 6.2c.8.6 1.3 1.6 1.3 2.6s-.5 2-1.3 2.6z" fill="#FF5F00" />
                </svg>
            )
        } else if (net === 'TROY') {
            return (
                <div className="font-extrabold italic text-sm tracking-tight text-white/90 border border-white/20 px-2 py-0.5 rounded bg-black/40">
                    troy
                </div>
            )
        } else if (net === 'AMERICAN_EXPRESS' || net === 'AMEX') {
            return (
                <div className="font-bold text-xs tracking-widest text-[#0070d2] bg-white border border-zinc-200 px-2 py-1 rounded">
                    AMEX
                </div>
            )
        } else {
            // VISA is default
            return (
                <div className="font-extrabold italic text-2xl tracking-tighter text-white drop-shadow-md">
                    VISA
                </div>
            )
        }
    }

    return (
        <div 
            className={`perspective-[1000px] w-full max-w-[360px] aspect-[1.586/1] cursor-pointer select-none ${className}`}
            onClick={() => flippable && setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="relative w-full h-full duration-700 preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                style={{ rotateX, rotateY }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* CARD FRONT */}
                <div 
                    className="absolute inset-0 w-full h-full rounded-2xl p-6 backface-hidden flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10"
                    style={{
                        background: `linear-gradient(135deg, ${cardBgColor}ee, ${cardBgColor}aa, ${cardBgColor}55)`,
                        boxShadow: `0 15px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25), 0 0 25px ${cardBgColor}33`,
                    }}
                >
                    {/* Metallic glow overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                    
                    {/* Top row: Bank name & Network */}
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-white text-base font-extrabold tracking-wide uppercase leading-tight drop-shadow-sm">
                                {card.bankName}
                            </p>
                            {card.cardProgram && (
                                <p className="text-white/60 text-[10px] font-medium tracking-wider uppercase">
                                    {card.cardProgram}
                                </p>
                            )}
                        </div>
                        <div className="h-8 flex items-center justify-end">
                            {renderCardNetwork()}
                        </div>
                    </div>

                    {/* Middle row: Card Chip, contactless indicator and points */}
                    <div className="flex items-center justify-between relative z-10 my-1">
                        <div className="flex items-center gap-3">
                            {/* Card Chip */}
                            <div className="w-10 h-8 rounded bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 border border-amber-400/40 relative overflow-hidden flex flex-col justify-around p-1 shadow-inner">
                                <div className="w-full h-[1px] bg-amber-800/20" />
                                <div className="w-full h-[1px] bg-amber-800/20" />
                                <div className="w-full h-[1px] bg-amber-800/20" />
                                <div className="absolute inset-0 flex justify-around">
                                    <div className="w-[1px] h-full bg-amber-800/20" />
                                    <div className="w-[1px] h-full bg-amber-800/20" />
                                </div>
                            </div>

                            {/* Contactless Wave Icon */}
                            <svg className="h-5 w-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5a5 5 0 015 5M16 3a8 8 0 018 8m-11 5a2 2 0 012 2m-2-12a14 14 0 0114 14" />
                            </svg>
                        </div>

                        {card.rewardsPoints !== undefined && card.rewardsPoints > 0 && (
                            <div className="flex items-center gap-1 px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
                                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                                <span className="text-[10px] font-extrabold text-white tracking-wide">
                                    {card.rewardsPoints.toLocaleString('tr-TR')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bottom row: Card Number, holder name & expiry */}
                    <div className="relative z-10 flex flex-col gap-2">
                        {/* Card Number */}
                        <p className="text-white text-lg sm:text-xl font-mono tracking-widest font-semibold drop-shadow-md">
                            •••• •••• •••• {card.last4Digits}
                        </p>
                        
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">KART ADI</p>
                                <p className="text-white/80 text-xs font-semibold tracking-wide truncate max-w-[180px]">
                                    {card.cardName}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest">SON ÖDEME</p>
                                <p className="text-white/80 text-xs font-semibold font-mono">
                                    {card.paymentDueDay ? `Her ayın ${card.paymentDueDay}.` : 'Belirsiz'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD BACK */}
                <div 
                    className="absolute inset-0 w-full h-full rounded-2xl backface-hidden flex flex-col justify-between overflow-hidden shadow-2xl border border-white/10"
                    style={{
                        background: '#151518',
                        transform: 'rotateY(180deg)',
                        boxShadow: `0 15px 35px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px ${cardBgColor}15`,
                    }}
                >
                    {/* Magnetic Stripe */}
                    <div className="w-full h-10 bg-black/90 mt-5" />

                    {/* Center: Info Table */}
                    <div className="px-6 py-2 flex-1 flex flex-col justify-center gap-2">
                        <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-1">
                            <span className="text-zinc-500 font-bold">AKDİ FAİZ</span>
                            <span className="text-white font-mono font-semibold">%{card.contractualRate ?? '4.42'}/ay</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-1">
                            <span className="text-zinc-500 font-bold">GECİKME FAİZİ</span>
                            <span className="text-white font-mono font-semibold">%{card.defaultRate ?? '5.42'}/ay</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-1">
                            <span className="text-zinc-500 font-bold">HESAP KESİM</span>
                            <span className="text-white font-mono font-semibold">Her ayın {card.cutOffDay ?? '15'}. günü</span>
                        </div>
                    </div>

                    {/* Signature Strip & CVV */}
                    <div className="px-6 mb-4 flex items-center gap-3">
                        <div className="flex-1 h-8 bg-zinc-800/60 rounded flex items-center px-3 text-[10px] text-zinc-400 italic tracking-wider font-serif">
                            Ogzie Finans Security Signature
                        </div>
                        <div className="w-12 h-8 bg-white text-black font-mono font-bold text-sm flex items-center justify-center rounded shadow-inner">
                            ***
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
