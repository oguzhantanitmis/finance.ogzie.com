'use client'

/* ============================================================
   AnalyticsMobile.tsx — Genel Analiz (mobil-native)
   Yerleşim: components/analytics/AnalyticsMobile.tsx
   ============================================================ */

import { Donut, Spark, tl } from '@/components/charts/MiniCharts'

type Accent = 'info' | 'success' | 'danger' | 'warning' | 'purple'
export interface CategorySlice { label: string; amount: number; color: Accent }

export default function AnalyticsMobile({ categories, netTrend, months }: {
  categories: CategorySlice[]; netTrend: number[]; months: string[]
}) {
  const total = categories.reduce((s, c) => s + c.amount, 0)
  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Harcama Dağılımı</h3>
      <div className="fintech-card p-[18px] flex gap-4 items-center">
        <Donut size={120} thickness={15} segments={categories.map((c) => ({ value: c.amount, color: c.color }))} center={
          <>
            <span className="text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>TOPLAM</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>{tl(total)}</span>
          </>
        } />
        <div className="flex-1 flex flex-col gap-[7px]">
          {categories.map((c) => (
            <span key={c.label} className="flex items-center gap-[7px] text-xs" style={{ color: 'var(--text-secondary)' }}>
              <i className="w-[9px] h-[9px] rounded-sm" style={{ background: `var(--accent-${c.color})` }} />{c.label}
              <span className="ml-auto font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>{tl(c.amount)}</span>
            </span>
          ))}
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Net Pozisyon Trendi (6 ay)</h3>
      <div className="fintech-card pt-[18px] px-3.5 pb-3">
        <Spark data={netTrend} color="info" height={80} />
        <div className="flex justify-between mt-2 px-1">
          {months.map((m) => <span key={m} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m}</span>)}
        </div>
      </div>
    </div>
  )
}
