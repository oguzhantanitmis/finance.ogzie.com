'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BrainCircuit, LineChart, ShieldAlert, Sparkles, RefreshCw, HandCoins, AlertTriangle } from 'lucide-react'
import { triggerAiAnalysisAction } from '@/app/actions/ai-actions'
import { useRouter } from 'next/navigation'

interface AIRecommendation {
    id: string
    type: string
    title: string
    content: string
    reasoning: string | null
    suggestedAction: string | null
    risk: string | null
}

export default function AIRecommendationWidget({ recommendations }: { recommendations: AIRecommendation[] }) {
    const router = useRouter()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true)
        setError(null)
        try {
            const res = await triggerAiAnalysisAction()
            if (!res.success) {
                setError(res.error || 'Analiz sırasında hata oluştu.')
                return
            }
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Analiz sırasında hata oluştu.')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const typeConfig = {
        STRATEGY: { icon: LineChart, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        SAVING: { icon: HandCoins, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        WARNING: { icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-400/10' },
        DEFAULT: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' }
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-zinc-400" />
                    <h2 className="font-semibold text-lg tracking-tight">Akıllı Finansal İçgörüler</h2>
                </div>
                <button
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
                    {isAnalyzing ? 'Analiz Ediliyor...' : 'Yeniden Analiz Et'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {recommendations.length === 0 ? (
                <div className="fintech-card p-6 flex flex-col items-center justify-center text-center py-10">
                    <Sparkles className="w-8 h-8 text-zinc-500 mb-3" />
                    <p className="text-zinc-400 font-medium">Büyük resmi görmek için verilerinizi analiz edin.</p>
                    <p className="text-sm text-zinc-500 max-w-sm mt-1">Yapay zeka, harcama alışkanlıklarınızı ve borçlarınızı tarayarak size özel stratejiler üretir.</p>
                    <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="mt-6 px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                        {isAnalyzing ? 'Analiz Ediliyor...' : 'Şimdi Analiz Et'}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {recommendations.map((rec, i) => {
                            const conf = typeConfig[rec.type as keyof typeof typeConfig] || typeConfig.DEFAULT
                            const Icon = conf.icon
                            return (
                                <motion.div
                                    key={rec.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="fintech-card p-5 border border-white/5 flex flex-col"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${conf.bg}`}>
                                            <Icon className={`w-4 h-4 ${conf.color}`} />
                                        </div>
                                        <h3 className="font-semibold text-[15px]">{rec.title}</h3>
                                    </div>
                                    <p className="text-sm text-zinc-400 leading-relaxed mb-4 flex-1">
                                        {rec.content}
                                    </p>
                                    
                                    {(rec.reasoning || rec.suggestedAction) && (
                                        <div className="mt-auto space-y-2 pt-4 border-t border-white/5 text-xs">
                                            {rec.reasoning && (
                                                <div className="flex items-start gap-2 text-zinc-500">
                                                    <span className="font-semibold mt-0.5">Neden:</span>
                                                    <span className="leading-snug">{rec.reasoning}</span>
                                                </div>
                                            )}
                                            {rec.risk && (
                                                <div className="flex items-start gap-2 text-rose-400/80">
                                                    <span className="font-semibold mt-0.5">Risk:</span>
                                                    <span className="leading-snug">{rec.risk}</span>
                                                </div>
                                            )}
                                            {rec.suggestedAction && (
                                                <div className="flex items-start gap-2 text-emerald-400/80">
                                                    <span className="font-semibold mt-0.5">Aksiyon:</span>
                                                    <span className="leading-snug">{rec.suggestedAction}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
