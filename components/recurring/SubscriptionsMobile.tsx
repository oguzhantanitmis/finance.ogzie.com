'use client'

/* ============================================================
   SubscriptionsMobile.tsx — Düzenli Ödemeler (abonelik + sabit gider)
   Yerleşim: components/recurring/SubscriptionsMobile.tsx
   ============================================================ */

import { useRouter } from 'next/navigation'
import { Repeat } from 'lucide-react'
import { tl } from '@/components/charts/MiniCharts'

export interface SubItem { id: string; name: string; amount: number; next: string; cat: string; hue?: number }
export interface RecurringItem { id: string; name: string; amount: number; cat: string; dueDay: number }

export default function SubscriptionsMobile({ subscriptions, recurring }: { subscriptions: SubItem[]; recurring: RecurringItem[] }) {
  const router = useRouter()
  const subTotal = subscriptions.reduce((a, b) => a + b.amount, 0)
  const recTotal = recurring.reduce((a, b) => a + b.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <div className="fintech-card kpi-card kpi-card-purple flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Abonelikler</p>
          <p className="text-lg font-extrabold tabular-nums mt-1" style={{ color: 'var(--text-primary)' }}>{tl(subTotal)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>aylık · {subscriptions.length} adet</p>
        </div>
        <div className="fintech-card kpi-card kpi-card-info flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sabit Gider</p>
          <p className="text-lg font-extrabold tabular-nums mt-1" style={{ color: 'var(--text-primary)' }}>{tl(recTotal)}</p>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>aylık · {recurring.length} adet</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Abonelikler</h3>
        <button onClick={() => router.push('/expenses?new=1')} className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Ekle</button>
      </div>
      <div className="fintech-card p-1.5">
        {subscriptions.length === 0 && (
          <p className="px-2.5 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Henüz abonelik yok.</p>
        )}
        {subscriptions.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-2.5 py-3" style={{ borderBottom: i < subscriptions.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
            <div className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center text-white font-extrabold text-[15px]" style={{ background: `hsl(${s.hue ?? 210} 55% 42%)` }}>{s.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.cat} · {s.next} sonra</p>
            </div>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(s.amount)}</p>
          </div>
        ))}
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Sabit Giderler</h3>
      <div className="fintech-card p-1.5">
        {recurring.length === 0 && (
          <p className="px-2.5 py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Henüz sabit gider yok.</p>
        )}
        {recurring.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 px-2.5 py-3" style={{ borderBottom: i < recurring.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
            <div className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
              <Repeat className="w-[18px] h-[18px]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.cat} · her ayın {r.dueDay}.’i</p>
            </div>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(r.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
