'use client'

/* ============================================================
   HealthMobile.tsx — Sağlık Puanı (mobil-native)
   Yerleşim: components/health/HealthMobile.tsx
   ============================================================ */

import { Gauge } from '@/components/charts/MiniCharts'

export interface HealthFactor { key: string; label: string; score: number; weight: number; detail: string }

export default function HealthMobile({ score, level, factors }: { score: number; level: string; factors: HealthFactor[] }) {
  const accentFor = (n: number) => (n >= 80 ? 'success' : n >= 60 ? 'info' : n >= 40 ? 'warning' : 'danger')
  return (
    <div className="space-y-4">
      <div className="fintech-card p-5 flex flex-col items-center gap-2.5">
        <Gauge score={score} size={128} />
        <span className="status-badge status-badge-info text-xs">{level} · iyileşiyor</span>
        <p className="text-[12.5px] text-center max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
          6 faktörün ağırlıklı ortalaması. 80+ hedefle, kart kullanımını düşürmek en hızlı kazanım.
        </p>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Faktör Kırılımı</h3>
      <div className="space-y-2.5">
        {factors.map((f) => {
          const accent = accentFor(f.score)
          return (
            <div key={f.key} className="fintech-card p-3.5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-[15px] font-extrabold tabular-nums" style={{ color: `var(--accent-${accent})` }}>{f.score}</span>
                  <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>ağırlık %{f.weight}</span>
                </span>
              </div>
              <div className={`progress-bar progress-bar-${accent === 'info' ? 'info' : accent}`}>
                <div className="progress-bar-fill" style={{ width: `${f.score}%`, background: `var(--accent-${accent})` }} />
              </div>
              <p className="text-[11.5px] mt-1.5" style={{ color: 'var(--text-muted)' }}>{f.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
