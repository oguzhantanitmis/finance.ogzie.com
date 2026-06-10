'use client'

/* ============================================================
   GoalsMobile.tsx — Hedefler (mobil-native)
   Yerleşim: components/goals/GoalsMobile.tsx
   ============================================================ */

import { useRouter } from 'next/navigation'
import { Target } from 'lucide-react'

import { Donut, tl } from '@/components/charts/MiniCharts'

type Accent = 'info' | 'success' | 'danger' | 'warning' | 'purple'
export interface GoalItem {
  id: string; title: string; current: number; target: number
  pct: number; deadline: string; color: Accent
}

export default function GoalsMobile({ goals }: { goals: GoalItem[] }) {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Aktif Hedefler</h3>
        <button onClick={() => router.push('/goals?new=1')} className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Hedef Ekle</button>
      </div>
      {goals.length === 0 && (
        <div className="fintech-card p-6 flex flex-col items-center text-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
            <Target className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Henüz aktif hedef yok</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Borç kapatma veya birikim hedefi belirle, ilerlemeni buradan takip et.</p>
        </div>
      )}
      <div className="space-y-3">
        {goals.map((g) => (
          <div key={g.id} className="fintech-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Donut size={56} thickness={8} segments={[{ value: g.pct, color: g.color }]} center={
                <span className="text-[13px] font-extrabold" style={{ color: 'var(--text-primary)' }}>%{g.pct}</span>
              } />
              <div className="flex-1 min-w-0">
                <p className="text-[15.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{g.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Hedef tarih: {g.deadline}</p>
              </div>
            </div>
            <div className={`progress-bar progress-bar-${g.color === 'purple' ? 'purple' : g.color}`}>
              <div className="progress-bar-fill" style={{ width: `${g.pct}%`, background: `var(--accent-${g.color})` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(g.current)}</span>
              <span className="text-[12.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>/ {tl(g.target)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
