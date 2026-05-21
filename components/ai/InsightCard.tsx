'use client'

import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { AIInsight } from '@prisma/client'

interface InsightCardProps {
    insight: AIInsight
}

export default function InsightCard({ insight }: InsightCardProps) {
    let icon, gradient, border, glow;

    switch (insight.type) {
        case 'SUCCESS':
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            gradient = 'from-emerald-950/40 to-emerald-900/10'
            border = 'border-emerald-900/50'
            glow = 'shadow-[0_0_30px_rgba(16,185,129,0.1)]'
            break;
        case 'WARNING':
            icon = <AlertTriangle className="w-5 h-5 text-amber-500" />
            gradient = 'from-amber-950/40 to-amber-900/10'
            border = 'border-amber-900/50'
            glow = 'shadow-[0_0_30px_rgba(245,158,11,0.1)]'
            break;
        case 'TIP':
            icon = <TrendingUp className="w-5 h-5 text-blue-400" />
            gradient = 'from-blue-950/40 to-blue-900/10'
            border = 'border-blue-900/50'
            glow = 'shadow-[0_0_30px_rgba(59,130,246,0.1)]'
            break;
        default:
            icon = <Info className="w-5 h-5 text-purple-400" />
            gradient = 'from-purple-950/40 to-purple-900/10'
            border = 'border-purple-900/50'
            glow = 'shadow-[0_0_30px_rgba(168,85,247,0.1)]'
            break;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative overflow-hidden rounded-2xl border ${border} bg-gradient-to-br ${gradient} p-6 ${glow} group backdrop-blur-sm`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-24 h-24" />
            </div>
            
            <div className="relative z-10 flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-black/40 border ${border} shadow-inner shrink-0`}>
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                        {insight.title}
                        {insight.type === 'SUCCESS' && <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px]">Fırsat</span>}
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                        {insight.content}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-4 block uppercase tracking-widest font-bold">
                        {new Date(insight.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}
