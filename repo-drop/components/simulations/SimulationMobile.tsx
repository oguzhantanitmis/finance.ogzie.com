'use client'

/* ============================================================
   SimulationMobile.tsx — Simülasyon (mobil-native)
   Yerleşim: components/simulations/SimulationMobile.tsx
   ============================================================ */

import { useState } from 'react'
import { tl } from '@/components/charts/MiniCharts'

export interface SimScenario { id: string; label: string; payoff: string; saveMonths: number; saveInterest: number }
export interface SimData { base: { payoff: string; interest: number }; scenarios: SimScenario[] }

export default function SimulationMobile({ data }: { data: SimData }) {
  const [sel, setSel] = useState(data.scenarios[0]?.id)
  const active = data.scenarios.find((x) => x.id === sel)
  return (
    <div className="space-y-4">
      <div className="fintech-card p-[18px]">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Mevcut durum</p>
        <div className="flex gap-2.5 mt-2.5">
          <div className="fintech-card flex-1 px-3.5 py-3">
            <p className="text-[10.5px] font-semibold" style={{ color: 'var(--text-muted)' }}>Borç bitişi</p>
            <p className="text-base font-extrabold mt-0.5" style={{ color: 'var(--text-primary)' }}>{data.base.payoff}</p>
          </div>
          <div className="fintech-card flex-1 px-3.5 py-3">
            <p className="text-[10.5px] font-semibold" style={{ color: 'var(--text-muted)' }}>Toplam faiz</p>
            <p className="text-base font-extrabold tabular-nums mt-0.5" style={{ color: 'var(--accent-danger)' }}>{tl(data.base.interest)}</p>
          </div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Senaryo Seç</h3>
      <div className="space-y-2.5">
        {data.scenarios.map((sc) => {
          const on = sc.id === sel
          return (
            <button key={sc.id} onClick={() => setSel(sc.id)}
              className={`fintech-card p-[15px] w-full text-left flex items-center gap-3 ${on ? 'kpi-card kpi-card-success' : ''}`}
              style={on ? { borderColor: 'var(--accent-success-border)' } : undefined}>
              <span className="w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center"
                style={{ border: `2px solid ${on ? 'var(--accent-success)' : 'var(--border-hover)'}` }}>
                {on && <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-success)' }} />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sc.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Bitiş {sc.payoff} · {sc.saveMonths} ay erken</p>
              </div>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="fintech-card p-4" style={{ background: 'linear-gradient(135deg, var(--accent-success-bg), transparent)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Bu senaryoyla kazanç</p>
          <div className="flex gap-[18px] mt-2">
            <div><p className="text-[22px] font-extrabold" style={{ color: 'var(--accent-success)' }}>{active.saveMonths} ay</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>daha erken bitiş</p></div>
            <div><p className="text-[22px] font-extrabold tabular-nums" style={{ color: 'var(--accent-success)' }}>{tl(active.saveInterest)}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>faiz tasarrufu</p></div>
          </div>
        </div>
      )}
    </div>
  )
}
