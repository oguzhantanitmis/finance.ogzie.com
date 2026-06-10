'use client'

/* ============================================================
   AssistantMobile.tsx — Finans Asistanı (mobil-native, streaming)
   Yerleşim: components/ai/AssistantMobile.tsx
   - Mevcut /api/ai uçunu kullanır (FinanceAssistantWorkspace ile aynı sözleşme).
   - Üstte aylık kota şeridi (used/limit prop) — bkz. handoff/04-token-takibi.md
   ============================================================ */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, Zap, Cpu } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK = [
  { label: 'Kart faizi', prompt: 'Bu zamana kadar kredi kartlarıma ne kadar faiz ödedim?' },
  { label: 'Borç bitişi', prompt: 'Borçlarım ne zaman bitiyor?' },
  { label: 'Bu ay ödeme', prompt: 'Bu ay ne kadar ödeme yapmam gerekiyor?' },
  { label: 'Kim borçlu', prompt: 'Kim bana ne kadar borçlu?' },
  { label: 'Riskli borçlar', prompt: 'En riskli borçlarım hangileri?' },
  { label: 'Nakit akışı', prompt: 'Bu ay nakit akışım nasıl?' },
]

async function readStream(res: Response, onChunk: (t: string) => void) {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    const data = await res.json()
    onChunk(data.text || data.error || 'Yanıt alınamadı.')
    return
  }
  const reader = res.body?.getReader()
  if (!reader) { onChunk('⚠️ Bağlantı hatası.'); return }
  const dec = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = dec.decode(value, { stream: true })
    if (chunk) onChunk(chunk)
  }
  reader.releaseLock()
}

export default function AssistantMobile({ used = 0, limit = 30000 }: { used?: number; limit?: number }) {
  const [msgs, setMsgs] = useState<Message[]>([
    { role: 'assistant', content: 'Merhaba 👋 Finans asistanınım. Aşağıdaki butonlardan birine dokun ya da soru yaz. Yalnızca sen sorunca çalışırım — boşta token harcamam.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) })
      await readStream(res, (chunk) => setMsgs((m) => {
        const u = [...m]; const last = u[u.length - 1]
        if (last?.role === 'assistant') u[u.length - 1] = { ...last, content: last.content + chunk }
        return u
      }))
    } catch {
      setMsgs((m) => { const u = [...m]; u[u.length - 1] = { role: 'assistant', content: '⚠️ Bağlantı hatası. Lütfen tekrar dene.' }; return u })
    } finally { setLoading(false) }
  }, [loading])

  const pct = limit ? Math.round((used / limit) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* kota şeridi */}
      <div className="fintech-card flex items-center gap-2.5 px-3 py-2.5">
        <Cpu className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-info)' }} />
        <div className="flex-1 progress-bar" style={{ height: 6 }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 90 ? 'var(--accent-danger)' : 'var(--accent-primary)' }} />
        </div>
        <span className="text-[11.5px] font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>{used.toLocaleString('tr-TR')}/{Math.round(limit / 1000)}k</span>
      </div>

      {/* mesajlar */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3.5 flex flex-col gap-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-2.5 max-w-[88%] ${m.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-[30px] h-[30px] rounded-[10px] shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="px-3.5 py-[11px] rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user'
                ? { background: 'var(--accent-primary)', color: '#fff', borderTopRightRadius: 4 }
                : { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderTopLeftRadius: 4 }}>
              {m.content || (loading && i === msgs.length - 1 ? '…' : '')}
            </div>
          </div>
        ))}
      </div>

      {/* hızlı promptlar */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {QUICK.map((q) => (
          <button key={q.label} onClick={() => send(q.prompt)} disabled={loading}
            className="chip shrink-0 disabled:opacity-50"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 999, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <Zap className="w-3 h-3" /> {q.label}
          </button>
        ))}
      </div>

      {/* giriş */}
      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 pb-1">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Finansal bir soru sor..." disabled={loading}
          className="flex-1 rounded-2xl px-3.5 py-3 text-[13.5px] outline-none"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
        <button type="submit" disabled={loading} className="w-[46px] rounded-[14px] shrink-0 flex items-center justify-center disabled:opacity-50"
          style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none' }}>
          <Send className="w-[18px] h-[18px]" />
        </button>
      </form>
    </div>
  )
}
