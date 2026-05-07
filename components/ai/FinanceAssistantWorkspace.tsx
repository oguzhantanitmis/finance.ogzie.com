'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, User, Zap, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import PageShell from '@/components/PageShell'
import { cn } from '@/lib/utils'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const QUICK_PROMPTS = [
    { label: 'Kart faizi', prompt: 'Bu zamana kadar kredi kartlarıma ne kadar faiz ödedim?' },
    { label: 'Borç bitişi', prompt: 'Borçlarım ne zaman bitiyor?' },
    { label: 'Bu ay ödeme', prompt: 'Bu ay ne kadar ödeme yapmam gerekiyor?' },
    { label: 'Kim borçlu', prompt: 'Kim bana ne kadar borçlu?' },
    { label: 'Ben kime borçluyum', prompt: 'Ben kime ne kadar borçluyum?' },
    { label: 'Riskli borçlar', prompt: 'En riskli borçlarım hangileri?' },
    { label: 'Nakit akışı', prompt: 'Bu ay nakit akışım nasıl?' },
    { label: 'Hedef takibi', prompt: 'Aktif hedeflerim ne durumda?' },
]

async function readStream(response: Response, onChunk: (text: string) => void) {
    const contentType = response.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
        const data = await response.json()
        onChunk(data.text || data.error || 'Yanıt alınamadı.')
        return
    }

    const reader = response.body?.getReader()
    if (!reader) {
        onChunk('⚠️ Bağlantı hatası.')
        return
    }

    const decoder = new TextDecoder()
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        if (chunk) onChunk(chunk)
    }
    reader.releaseLock()
}

export default function FinanceAssistantWorkspace() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Merhaba. Ben finans asistanınım. Aşağıdaki hızlı butonları kullanabilir ya da doğrudan soru sorabilirsin.\n\nDurum analizi, borç stratejisi, abonelik tasarrufu ve sağlık puanı gibi konularda yardımcı olurum.' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages])

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || loading) return
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: text }])
        setLoading(true)
        setMessages(prev => [...prev, { role: 'assistant', content: '' }])

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text }),
            })

            await readStream(res, (chunk) => {
                setMessages(prev => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last && last.role === 'assistant') {
                        updated[updated.length - 1] = { ...last, content: last.content + chunk }
                    }
                    return updated
                })
            })
        } catch {
            setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: '⚠️ Bağlantı hatası. Lütfen tekrar dene.' }
                }
                return updated
            })
        } finally {
            setLoading(false)
        }
    }, [loading])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await sendMessage(input)
    }

    return (
        <PageShell width="dar" className="font-sans">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col">
                <header className="mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--text-primary)' }}>
                        <Bot className="w-6 h-6" style={{ color: 'var(--text-inverse)' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Finans Asistanı</h1>
                        <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--accent-success)' }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent-success)' }} />
                            </span>
                            Streaming aktif, gerçek verilerinle çalışır
                        </p>
                    </div>
                </header>

                <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_PROMPTS.map((qp) => (
                        <button
                            key={qp.label}
                            onClick={() => sendMessage(qp.prompt)}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
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
                                'flex gap-3 max-w-[85%]',
                                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                            )}
                        >
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                    msg.role === 'user' ? 'bg-[var(--bg-elevated)]' : ''
                                )}
                                style={msg.role !== 'user' ? { background: 'var(--text-primary)' } : undefined}
                            >
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} />}
                            </div>
                            <div
                                className={cn(
                                    'p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
                                    msg.role === 'user'
                                        ? 'rounded-tr-sm border'
                                        : 'rounded-tl-sm shadow-xl'
                                )}
                                style={msg.role === 'user' ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-default)' } : { background: 'var(--text-primary)', color: 'var(--text-inverse)' }}
                            >
                                {msg.content || (loading && idx === messages.length - 1 ? (
                                    <span className="flex gap-1">
                                        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                ) : null)}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Finansal bir soru sor..."
                        className="w-full rounded-2xl py-4 pl-4 pr-12 focus:outline-none transition-colors"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        style={{ background: 'var(--text-primary)' }}
                    >
                        <Send className="w-4 h-4" style={{ color: 'var(--text-inverse)' }} />
                    </button>
                </form>
            </div>
        </PageShell>
    )
}
