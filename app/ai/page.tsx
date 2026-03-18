'use client'

import { useState, useRef, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { Send, Bot, User, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const QUICK_PROMPTS = [
    { label: 'Aylık özet', prompt: 'Bu ayki finansal durumumu özetle' },
    { label: 'Borç stratejisi', prompt: 'Borçlarımı nasıl önceliklendirmem lazım?' },
    { label: 'Tasarruf önerisi', prompt: 'Aboneliklerimde tasarruf fırsatları var mı?' },
    { label: 'Sağlık puanı', prompt: 'Finansal sağlık puanımı açıkla ve iyileştirme önerileri ver' },
    { label: 'Nakit durum', prompt: 'Kullanılabilir nakitim ne kadar ve bu yeterli mi?' },
    { label: 'Hedef takibi', prompt: 'Aktif hedeflerim ne durumda?' },
]

export default function AIPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Merhaba! Ben senin finansal asistanınım. Aşağıdaki hızlı butonları kullanabilir ya da doğrudan soru sorabilirsin.\n\n📊 Durum analizi, borç stratejisi, abonelik tasarrufu, sağlık puanı — her konuda yardımcı olurum.' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setLoading(true)

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text }),
            })
            const data = await res.json()
            if (data.text) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Bağlantı hatası. Lütfen tekrar dene.' }])
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await sendMessage(input)
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0 font-sans">
            <Navbar />

            <main className="min-h-screen lg:pl-72">
                <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-5 sm:px-6 md:px-8 lg:px-10 xl:px-12">
                <header className="mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Bot className="text-black w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Finans Asistanı</h1>
                        <p className="text-zinc-500 text-sm">Context-aware • Gerçek verilerinle çalışır</p>
                    </div>
                </header>

                {/* Hızlı Butonlar */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_PROMPTS.map((qp) => (
                        <button
                            key={qp.label}
                            onClick={() => sendMessage(qp.prompt)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                        >
                            <Zap className="w-3 h-3" />
                            {qp.label}
                        </button>
                    ))}
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={idx}
                            className={cn(
                                "flex gap-3 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                msg.role === 'user' ? "bg-zinc-800" : "bg-white"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-black" />}
                            </div>
                            <div className={cn(
                                "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                                msg.role === 'user'
                                    ? "bg-[#1a1a1a] text-white border border-white/5 rounded-tr-sm"
                                    : "bg-white text-black rounded-tl-sm shadow-xl"
                            )}>
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-3 max-w-[85%]"
                        >
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-black" />
                            </div>
                            <div className="p-4 rounded-2xl bg-white/10 text-white rounded-tl-sm w-24 flex items-center justify-center">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Finansal bir soru sor..."
                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl py-4 pl-4 pr-12 focus:outline-none focus:border-white/20 transition-colors"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4 text-black" />
                    </button>
                </form>
                </div>
            </main>
        </div>
    )
}
