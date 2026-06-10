'use client'

/* ============================================================
   DebtsMobile.tsx — Borçlar (mobil-native)
   Yerleşim: components/debts/DebtsMobile.tsx
   lg altı için; lg ve üstünde mevcut DebtsWorkspace kalabilir:
     <div className="lg:hidden"><DebtsMobile debts={...} /></div>
     <div className="hidden lg:block"><DebtsWorkspace .../></div>
   ============================================================ */

import { Landmark, CreditCard, Users } from 'lucide-react'
import { Donut, tl, type Accent } from '@/components/charts/MiniCharts'

export type DebtType = 'loan' | 'card' | 'kmh' | 'personal'
export interface DebtItem {
  id: string; name: string; type: DebtType; bank: string
  remaining: number; monthly: number; nextDue: string
  rate?: number; paidPct: number; critical?: boolean
}

const TYPE_LABEL: Record<DebtType, string> = { loan: 'Kredi', card: 'Kredi Kartı', kmh: 'KMH', personal: 'Kişi' }
const TYPE_ICON: Record<DebtType, typeof Landmark> = { loan: Landmark, card: CreditCard, kmh: Landmark, personal: Users }
const TYPE_ACCENT: Record<DebtType, Accent> = { loan: 'info', card: 'danger', kmh: 'warning', personal: 'purple' }

function IconBadge({ Icon, accent, box = 38 }: { Icon: typeof Landmark; accent: string; box?: number }) {
  return (
    <div className="shrink-0 flex items-center justify-center rounded-xl"
      style={{ width: box, height: box, background: `var(--accent-${accent}-bg)`, color: `var(--accent-${accent})` }}>
      <Icon className="w-[18px] h-[18px]" />
    </div>
  )
}

export default function DebtsMobile({ debts }: { debts: DebtItem[] }) {
  const totalRemaining = debts.reduce((a, b) => a + b.remaining, 0)
  const totalMonthly = debts.reduce((a, b) => a + b.monthly, 0)
  const byType = (['card', 'loan', 'kmh', 'personal'] as DebtType[])
    .map((t) => ({ value: debts.filter((x) => x.type === t).reduce((a, b) => a + b.remaining, 0), color: TYPE_ACCENT[t], label: TYPE_LABEL[t] }))
    .filter((x) => x.value > 0)
  const due = [...debts].sort((a, b) => parseInt(a.nextDue) - parseInt(b.nextDue))

  if (debts.length === 0) {
    return (
      <div className="fintech-card p-6 flex flex-col items-center text-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
          <Landmark className="h-5 w-5" />
        </span>
        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aktif borç kaydı yok</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kredi, kart veya şahsi borç eklediğinde özet ve ödeme takvimi burada görünür.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* özet */}
      <div className="fintech-card p-4 flex gap-4 items-center">
        <Donut size={110} thickness={14} segments={byType} center={
          <>
            <span className="text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>TOPLAM</span>
            <span className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(totalRemaining)}</span>
          </>
        } />
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Bu ay ödenecek</p>
          <p className="text-2xl font-extrabold tabular-nums mb-2.5" style={{ color: 'var(--accent-danger)' }}>{tl(totalMonthly)}</p>
          <div className="flex flex-col gap-1.5">
            {byType.map((s) => (
              <span key={s.label} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                <i className="w-2 h-2 rounded-sm" style={{ background: `var(--accent-${s.color})` }} />{s.label}
                <span className="ml-auto tabular-nums" style={{ color: 'var(--text-muted)' }}>{tl(s.value)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ödemen gereken */}
      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Ödemen Gereken Borçlar</h3>
      <div className="fintech-card p-1.5">
        {due.map((o, i) => {
          const Icon = TYPE_ICON[o.type]
          return (
            <div key={o.id} className="flex items-center gap-3 px-2.5 py-3" style={{ borderBottom: i < due.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
              <IconBadge Icon={Icon} accent={o.critical ? 'danger' : 'info'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{o.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{TYPE_LABEL[o.type]} · {o.nextDue} sonra</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(o.monthly)}</p>
                {o.critical && <span className="status-badge status-badge-danger mt-1 text-[9px]">YARIN</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* tüm borçlar */}
      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Tüm Borçlar</h3>
      <div className="space-y-2.5">
        {debts.map((o) => {
          const Icon = TYPE_ICON[o.type]
          return (
            <div key={o.id} className={`fintech-card p-4 ${o.critical ? 'fintech-card-critical' : ''}`}>
              <div className="flex items-center gap-3">
                <IconBadge Icon={Icon} accent={TYPE_ACCENT[o.type]} box={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{o.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.bank} · {TYPE_LABEL[o.type]}{o.rate ? ` · %${o.rate}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(o.remaining)}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>kalan</p>
                </div>
              </div>
              <div className={`progress-bar mt-3 ${o.type === 'card' ? 'progress-bar-danger' : 'progress-bar-success'}`}>
                <div className="progress-bar-fill" style={{ width: `${o.paidPct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>%{o.paidPct} ödendi</span>
                <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>aylık {tl(o.monthly)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
