'use client'

import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AIHeader({ summary }: { summary: string }) {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-zinc-400" />
                <h2 className="text-zinc-400 font-medium">Bugün finansal durumun</h2>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="fintech-card p-6 bg-gradient-to-br from-[#0a0a0a] to-[#121212] relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles className="w-24 h-24 text-white" />
                </div>

                <p className="text-xl md:text-2xl font-semibold leading-snug max-w-3xl relative z-10">
                    {summary}
                </p>

                <div className="mt-6 flex items-center gap-4 relative z-10">
                    <button className="flex items-center gap-2 text-sm font-semibold hover:text-white/80 transition-colors">
                        Detaylı analizi gör
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
