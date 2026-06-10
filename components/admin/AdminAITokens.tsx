'use client'

/* ============================================================
   AdminAITokens.tsx — Admin: kullanıcı başına AI token & maliyet
   ------------------------------------------------------------
   Yerleşim: components/admin/AdminAITokens.tsx
   Kullanım: /admin sayfasına yeni bir sekme/bölüm olarak ekle,
   veya AdminUsersWorkspace içine entegre et. Mevcut globals.css
   class'larını (fintech-card / kpi-card / progress-bar /
   status-badge) kullanır; tema otomatik.

   Veriyi getCurrentMonthTokenUsage(...) (bkz. 03-token-takibi.md)
   ile server tarafında çekip prop olarak geçir.
   ============================================================ */

import { useState } from 'react'
import { Cpu, Zap, Activity, DollarSign } from 'lucide-react'

import Modal from '@/components/ui/Modal'

export interface AITokenUser {
  id: string
  name: string
  email: string
  role: 'USER' | 'SUPERUSER'
  used: number        // bu ay tüketilen token
  limit: number       // aylık kota
  costUsd: number     // tahmini maliyet ($)
  requests: number    // istek sayısı
}

function fmtInt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(Math.round(n))
}

export default function AdminAITokens({
  users,
  month = 'Bu ay',
  onUpdateLimit,
}: {
  users: AITokenUser[]
  month?: string
  /** "Düzenle" → kullanıcı başına aylık token limitini güncelleyen server action */
  onUpdateLimit?: (userId: string, limit: number) => Promise<{ success: boolean; message: string }>
}) {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const openEditor = () => {
    setDrafts(Object.fromEntries(users.map((u) => [u.id, String(u.limit)])))
    setFeedback('')
    setEditing(true)
  }

  const saveLimit = async (userId: string) => {
    if (!onUpdateLimit) return
    const limit = Number(drafts[userId])
    setSavingId(userId)
    setFeedback('')
    try {
      const result = await onUpdateLimit(userId, limit)
      setFeedback(result.message)
    } catch {
      setFeedback('Kota güncellenemedi.')
    } finally {
      setSavingId(null)
    }
  }

  const totalUsed = users.reduce((a, b) => a + b.used, 0)
  const totalCost = users.reduce((a, b) => a + b.costUsd, 0)
  const totalReq = users.reduce((a, b) => a + b.requests, 0)

  const summary = [
    { label: 'Toplam Token', value: fmtInt(totalUsed), icon: Cpu, accent: 'kpi-card-info' },
    { label: 'Tahmini Maliyet', value: '$' + totalCost.toFixed(2), icon: DollarSign, accent: 'kpi-card-warning' },
    { label: 'Toplam İstek', value: fmtInt(totalReq), icon: Activity, accent: 'kpi-card-purple' },
  ]

  return (
    <section className="animate-fade-in-up">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>{month}</p>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AI Kullanımı</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kullanıcı başına token tüketimi, maliyet ve aylık kota.</p>
      </header>

      {/* Özet KPI'lar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {summary.map((s) => (
          <div key={s.label} className={`kpi-card ${s.accent}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <s.icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kullanıcı kartları (mobil + masaüstü uyumlu) */}
      <div className="space-y-3">
        {users.map((u) => {
          const pct = u.limit > 0 ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0
          const warn = pct >= 90
          return (
            <div key={u.id} className={`fintech-card p-4 sm:p-5 ${warn ? 'fintech-card-critical' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <span className={`status-badge ${u.role === 'SUPERUSER' ? 'status-badge-purple' : 'status-badge-neutral'}`}>
                  {u.role === 'SUPERUSER' ? 'SUPER' : 'USER'}
                </span>
              </div>

              <div className={`progress-bar ${warn ? 'progress-bar-danger' : 'progress-bar-info'} mt-4`}>
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>

              <div className="flex items-center justify-between mt-2.5">
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {fmtInt(u.used)} / {fmtInt(u.limit)} token
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{u.requests} istek</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>${u.costUsd.toFixed(2)}</span>
                  {warn && <span className="status-badge status-badge-danger">%{pct}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fintech-card p-4 mt-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-warning-bg)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Aylık kota limiti</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kullanıcı başına token tavanı; dolunca ücretsiz yerel özet devreye girer.</p>
        </div>
        <button className="btn-secondary" onClick={openEditor}>Düzenle</button>
      </div>

      {editing && onUpdateLimit ? (
        <Modal title="Aylık AI Kota Limitleri" subtitle="0 = limitsiz" onClose={() => setEditing(false)}>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={drafts[u.id] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: e.target.value }))}
                  className="w-32 rounded-xl px-3 py-2 text-sm tabular-nums outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  className="btn-secondary"
                  disabled={savingId === u.id}
                  onClick={() => saveLimit(u.id)}
                >
                  {savingId === u.id ? '…' : 'Kaydet'}
                </button>
              </div>
            ))}
            {feedback ? (
              <p className="text-xs pt-1" style={{ color: 'var(--text-secondary)' }}>{feedback}</p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
