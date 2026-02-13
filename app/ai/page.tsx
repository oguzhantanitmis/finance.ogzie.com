'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { Send, Bot, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export default function AIPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Merhaba! Ben senin finansal asistanınım. Bugün sana nasıl yardımcı olabilirim? Borç analizleri, yatırım tavsiyeleri veya bütçe planlaması hakkında konuşabiliriz.' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = input
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setLoading(true)

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMessage }),
            })

            const data = await res.json()

            if (data.text) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.text }])
            }
        } catch (error) {
            console.error(error)
            setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, şu an bağlantıda bir sorun yaşıyorum.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0 font-sans">
            <Navbar />

            <main className="md:ml-64 h-screen flex flex-col max-w-4xl mx-auto p-4 md:p-6">
                <header className="mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                        <Bot className="text-black w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI Finans Koçu</h1>
                        <p className="text-zinc-500 text-sm">7/24 Aktif Analist</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
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
                                "p-4 rounded-2xl text-sm leading-relaxed",
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
            </main>
        </div>
    )
}
