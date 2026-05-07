'use client'

import React from 'react'
import { Sparkles, ArrowRight, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function AIHeader({ summary, canUseAi = false }: { summary: string; canUseAi?: boolean }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent-success)' }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: 'var(--accent-success)' }} />
                </span>
                <h2 className="font-medium" style={{ color: 'var(--text-muted)' }}>AI finansal durum analizi</h2>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="fintech-card p-6 relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-primary) 100%)' }}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-24 h-24" style={{ color: 'var(--text-primary)' }} />
                </div>

                <p className="text-xl md:text-2xl font-semibold leading-snug max-w-3xl relative z-10 privacy-blur" style={{ color: 'var(--text-primary)' }}>
                    {summary}
                </p>

                <div className="mt-6 flex items-center gap-4 relative z-10 flex-wrap">
                    <Link href="/analytics" className="flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: 'var(--accent-primary)' }}>
                        Detaylı analizi aç
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                    {canUseAi ? (
                        <Link href="/ai" className="flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: 'var(--text-muted)' }}>
                            <MessageSquare className="w-4 h-4" />
                            AI ile konuş
                        </Link>
                    ) : null}
                </div>
            </motion.div>
        </div>
    )
}
