'use client'

/* ============================================================
   BudgetMobile.tsx — Bütçe (mobil-native)
   Yerleşim: components/budget/BudgetMobile.tsx
   ============================================================ */

import { ArrowDownLeft, Landmark, CreditCard, Wallet, Sparkles } from 'lucide-react'
import { tl } from '@/components/charts/MiniCharts'

export interface BudgetSummary {
  plannedIncome: number; fixedCommitments: number
  debtCommitments: number; freeCash: number
}

export default function BudgetMobile({ s }: { s: BudgetSummary }) {
  const rows = [
    { label: 'Planlanan Gelir', value: s.plannedIncome, accent: 'success', Icon: ArrowDownLeft },
    { label: 'Sabit Yük', value: s.fixedCommitments, accent: 'warning', Icon: Landmark },
    { label: 'Borç Baskısı', value: s.debtCommitments, accent: 'danger', Icon: CreditCard },
  ]
  const spent = s.fixedCommitments + s.debtCommitments
  const usePct = s.plannedIncome ? Math.round((spent / s.plannedIncome) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="fintech-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Bu ay serbest nakit</p>
        <p className="text-[34px] font-extrabold tabular-nums mt-1 mb-3.5" style={{ color: s.freeCash < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{tl(s.freeCash)}</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5" style={{ background: 'var(--bg-elevated)' }}>
          <div style={{ width: `${(s.fixedCommitments / s.plannedIncome) * 100}%`, background: 'var(--accent-warning)' }} />
          <div style={{ width: `${(s.debtCommitments / s.plannedIncome) * 100}%`, background: 'var(--accent-danger)' }} />
          <div style={{ flex: 1, background: 'var(--accent-success)' }} />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Gelirin %{usePct}’i yüklere gidiyor, %{100 - usePct}’i serbest.</p>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Aylık Kalemler</h3>
      <div className="fintech-card p-1.5">
        {rows.map((r, i) => (
          <div key={r.label} className="flex items-center gap-3 px-2.5 py-3" style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
            <div className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center" style={{ background: `var(--accent-${r.accent}-bg)`, color: `var(--accent-${r.accent})` }}>
              <r.Icon className="w-[18px] h-[18px]" />
            </div>
            <p className="flex-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.label}</p>
            <p className="text-[15px] font-bold tabular-nums" style={{ color: `var(--accent-${r.accent})` }}>{tl(r.value)}</p>
          </div>
        ))}
        <div className="flex items-center gap-3 px-2.5 py-3" style={{ borderTop: '1px solid var(--border-hover)' }}>
          <div className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
            <Wallet className="w-[18px] h-[18px]" />
          </div>
          <p className="flex-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Serbest Nakit</p>
          <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--accent-success)' }}>{tl(s.freeCash)}</p>
        </div>
      </div>

      <div className="fintech-card p-4 flex gap-3 items-start">
        <div className="w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center" style={{ background: 'var(--accent-info-bg)', color: 'var(--accent-info)' }}>
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="flex-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Tampon hedefini <b style={{ color: 'var(--text-primary)' }}>{tl(s.fixedCommitments * 0.2)}</b> bandına çekersen ay sonu sürprizlerine karşı korunursun.
        </p>
      </div>
    </div>
  )
}
