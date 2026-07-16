'use client'

/* ============================================================
   ReportsMobile.tsx — Raporlar (mobil-native)
   Yerleşim: components/reports/ReportsMobile.tsx
   Mevcut /api/export/* uçlarını CSV/PDF butonlarına bağla.
   ============================================================ */

import { List, ReceiptText } from 'lucide-react'
import { DualBars, tl } from '@/components/charts/MiniCharts'

export interface ReportSeries { months: string[]; income: number[]; expense: number[] }

export default function ReportsMobile({ data }: { data: ReportSeries }) {
  const totIn = data.income.reduce((a, b) => a + b, 0)
  const totOut = data.expense.reduce((a, b) => a + b, 0)
  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <div className="fintech-card kpi-card kpi-card-success flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>6 ay gelir</p>
          <p className="text-[17px] font-extrabold tabular-nums mt-1" style={{ color: 'var(--accent-success)' }}>{tl(totIn)}</p>
        </div>
        <div className="fintech-card kpi-card kpi-card-danger flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>6 ay gider</p>
          <p className="text-[17px] font-extrabold tabular-nums mt-1" style={{ color: 'var(--accent-danger)' }}>{tl(totOut)}</p>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Gelir / Gider (6 ay)</h3>
      <div className="fintech-card p-[18px]">
        <DualBars labels={data.months} a={data.income} b={data.expense} />
        <div className="flex gap-[18px] justify-center mt-3.5">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}><i className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent-success)' }} />Gelir</span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}><i className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--accent-danger)' }} />Gider</span>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-widest px-0.5" style={{ color: 'var(--text-muted)' }}>Dışa Aktar</h3>
      <div className="flex gap-2.5">
        <button className="btn-secondary flex-1"><List className="w-4 h-4" /> CSV indir</button>
        <button className="btn-secondary flex-1"><ReceiptText className="w-4 h-4" /> PDF rapor</button>
      </div>
    </div>
  )
}
