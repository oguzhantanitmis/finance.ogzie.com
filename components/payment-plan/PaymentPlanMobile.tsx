'use client'

/* ============================================================
   PaymentPlanMobile.tsx — Ödeme Planı (mobil-native)
   Yerleşim: components/payment-plan/PaymentPlanMobile.tsx
   ============================================================ */

import { Target } from 'lucide-react'
import { tl } from '@/components/charts/MiniCharts'

export interface PlanStep { order: number; name: string; rate: number; remaining: number; focus?: boolean }
export interface PlanData { strategy: string; payoffDate: string; monthlyBudget: number; saved: number; steps: PlanStep[] }

export default function PaymentPlanMobile({ plan }: { plan: PlanData }) {
  return (
    <div className="space-y-4">
      <div className="fintech-card p-[18px]">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-success-bg)', color: 'var(--accent-success)' }}>
            <Target className="w-[17px] h-[17px]" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Strateji</p>
            <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{plan.strategy}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {[['Bitiş tahmini', plan.payoffDate], ['Aylık bütçe', tl(plan.monthlyBudget)], ['Birikti', tl(plan.saved)]].map(([l, val]) => (
            <div key={l} className="fintech-card flex-1 px-3 py-2.5">
              <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{l}</p>
              <p className="text-[13px] font-bold tabular-nums mt-0.5" style={{ color: 'var(--text-primary)' }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Ödeme Sırası</h3>
      {plan.steps.length === 0 && (
        <div className="fintech-card p-6 text-center">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Ödeme planı boş</p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Aktif borç bulunamadı ya da veriler şu an yüklenemedi. Sayfayı yenilemeyi deneyebilirsin.</p>
        </div>
      )}
      <div className="space-y-2.5">
        {plan.steps.map((st) => (
          <div key={st.order} className={`fintech-card p-[15px] flex items-center gap-3.5 ${st.focus ? 'kpi-card kpi-card-success' : ''}`}>
            <div className="w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center text-sm font-extrabold"
              style={{ background: st.focus ? 'var(--accent-success)' : 'var(--bg-elevated)', color: st.focus ? '#fff' : 'var(--text-secondary)' }}>{st.order}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{st.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>%{st.rate} faiz · {tl(st.remaining)} kalan</p>
            </div>
            {st.focus && <span className="status-badge status-badge-success">ÖNCE BU</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
