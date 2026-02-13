'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, AlertTriangle, CheckCircle, Zap, X } from 'lucide-react'
import { markInsightAsRead } from '@/app/actions'
import { cn } from '@/lib/utils'

interface Insight {
    id: string
    title: string
    content: string
    type: string
    isRead: boolean
}

export default function InsightFeed({ insights: initialInsights }: { insights: Insight[] }) {
    const [insights, setInsights] = React.useState(initialInsights.filter(i => !i.isRead))

    const handleDismiss = async (id: string) => {
        setInsights(prev => prev.filter(i => i.id !== id))
        await markInsightAsRead(id)
    }

    if (insights.length === 0) return null

    return (
        <div className="space-y-4 mb-10">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-widest px-1">AI Analiz Akışı</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {insights.map((insight) => (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20 }}
                            className={cn(
                                "relative p-5 rounded-3xl border group transition-all duration-300",
                                insight.type === 'RISK' ? "bg-red-500/5 border-red-500/20" :
                                    insight.type === 'WARNING' ? "bg-amber-500/5 border-amber-500/20" :
                                        insight.type === 'SUCCESS' ? "bg-emerald-500/5 border-emerald-500/20" :
                                            "bg-zinc-900/50 border-white/5"
                            )}
                        >
                            <button
                                onClick={() => handleDismiss(insight.id)}
                                className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                    insight.type === 'RISK' ? "bg-red-500/20 text-red-500" :
                                        insight.type === 'WARNING' ? "bg-amber-500/20 text-amber-500" :
                                            insight.type === 'SUCCESS' ? "bg-emerald-500/20 text-emerald-500" :
                                                "bg-white/10 text-white"
                                )}>
                                    {insight.type === 'RISK' ? <AlertTriangle className="w-5 h-5" /> :
                                        insight.type === 'WARNING' ? <AlertTriangle className="w-5 h-5" /> :
                                            insight.type === 'SUCCESS' ? <CheckCircle className="w-5 h-5" /> :
                                                <Zap className="w-5 h-5" />}
                                </div>
                                <div className="pr-6">
                                    <h3 className="font-bold text-white mb-1">{insight.title}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {insight.content}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    )
}
