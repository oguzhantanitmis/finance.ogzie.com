'use client'

/* ============================================================
   PeopleMobile.tsx — Kişiler (alacak/verecek, mobil-native)
   Yerleşim: components/people/PeopleMobile.tsx
   ============================================================ */

import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { tl } from '@/components/charts/MiniCharts'

export interface PersonItem {
  id: string; name: string
  net: number          // + = size borçlu, - = siz borçlusunuz
  owesYou: number; youOwe: number
  last: string; installments?: string
}

export default function PeopleMobile({ people }: { people: PersonItem[] }) {
  const owesYou = people.reduce((a, b) => a + b.owesYou, 0)
  const youOwe = people.reduce((a, b) => a + b.youOwe, 0)
  const signed = (n: number) => (n > 0 ? '+' : '') + tl(n)

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <div className="fintech-card kpi-card kpi-card-success flex-1 p-[15px]">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="w-[13px] h-[13px]" style={{ color: 'var(--accent-success)' }} />
            <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Size Borçlu</p>
          </div>
          <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--accent-success)' }}>{tl(owesYou)}</p>
        </div>
        <div className="fintech-card kpi-card kpi-card-danger flex-1 p-[15px]">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-[13px] h-[13px]" style={{ color: 'var(--accent-danger)' }} />
            <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Siz Borçlusunuz</p>
          </div>
          <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--accent-danger)' }}>{tl(youOwe)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Kişiler</h3>
        <button className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Kişi Ekle</button>
      </div>

      <div className="space-y-2.5">
        {people.map((p) => {
          const pos = p.net >= 0
          return (
            <div key={p.id} className="fintech-card p-[15px] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center text-[17px] font-bold"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{p.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.installments || 'Tek seferlik'} · {p.last}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-extrabold tabular-nums" style={{ color: pos ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{signed(p.net)}</p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{pos ? 'size borçlu' : 'siz borçlusunuz'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
