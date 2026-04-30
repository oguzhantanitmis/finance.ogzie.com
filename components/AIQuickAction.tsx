'use client'

import { useState } from 'react'
import { Bot, Sparkles, TrendingUp, PiggyBank, Shield, ArrowRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const QUICK_ACTIONS = [
    { label: 'Aylık özet', prompt: 'Bu ayki finansal durumumu özetle', icon: TrendingUp, color: 'var(--accent-info)' },
    { label: 'Tasarruf fırsatları', prompt: 'Aboneliklerimde tasarruf fırsatları var mı?', icon: PiggyBank, color: 'var(--accent-success)' },
    { label: 'Borç stratejisi', prompt: 'Borçlarımı nasıl önceliklendirmem lazım?', icon: Shield, color: 'var(--accent-purple)' },
]

export default function AIQuickAction() {
    const [expanded, setExpanded] = useState(false)
    const [response, setResponse] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeLabel, setActiveLabel] = useState('')

    async function ask(prompt: string, label: string) {
        setActiveLabel(label)
        setLoading(true)
        setExpanded(true)
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            })
            const data = await res.json()
            setResponse(data.text || 'Yanıt alınamadı.')
        } catch {
            setResponse('Bağlantı hatası. Tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fintech-card overflow-hidden">
            {/* Header */}
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: expanded ? '1px solid var(--border-default)' : 'none' }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-primary)', color: '#000' }}>
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>AI Finans Asistanı</h3>
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-success)' }} />
                            Aktif — verilerinle çalışıyor
                        </p>
                    </div>
                </div>
                <Link href="/ai" className="flex items-center gap-1 text-xs font-medium cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                    Tam asistan <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Quick Actions */}
            <div className="p-4 flex gap-2 flex-wrap">
                {QUICK_ACTIONS.map((qa) => (
                    <button
                        key={qa.label}
                        onClick={() => ask(qa.prompt, qa.label)}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    >
                        <qa.icon className="w-3.5 h-3.5" style={{ color: qa.color }} />
                        {qa.label}
                    </button>
                ))}
            </div>

            {/* Response Panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                                    <Sparkles className="w-3 h-3" /> {activeLabel}
                                </p>
                                <button onClick={() => { setExpanded(false); setResponse(null) }} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {loading ? (
                                <div className="flex gap-1 py-4">
                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-primary)', animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-primary)', animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-primary)', animationDelay: '300ms' }} />
                                </div>
                            ) : (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap p-4 rounded-xl" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                                    {response}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
