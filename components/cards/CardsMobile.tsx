'use client'

/* ============================================================
   CardsMobile.tsx — Kartlarım (mobil-native)
   Yerleşim: components/cards/CardsMobile.tsx
   ============================================================ */

import { tl } from '@/components/charts/MiniCharts'

export interface CreditCardItem {
  id: string; bank: string; last4: string
  limit: number; debt: number; min: number
  statementDay: number; dueDay: number
  hue?: number   // 0-360 kart rengi tonu
}

export default function CardsMobile({ cards }: { cards: CreditCardItem[] }) {
  const totalDebt = cards.reduce((a, b) => a + b.debt, 0)
  const totalLimit = cards.reduce((a, b) => a + b.limit, 0)
  const util = totalLimit ? Math.round((totalDebt / totalLimit) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5">
        <div className="fintech-card kpi-card kpi-card-danger flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Toplam Kart Borcu</p>
          <p className="text-lg font-extrabold tabular-nums mt-1" style={{ color: 'var(--accent-danger)' }}>{tl(totalDebt)}</p>
        </div>
        <div className="fintech-card kpi-card kpi-card-info flex-1 p-3.5">
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Kullanım</p>
          <p className="text-lg font-extrabold tabular-nums mt-1" style={{ color: 'var(--text-primary)' }}>%{util}</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Kartlarım</h3>
        <button className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Kart Ekle</button>
      </div>

      <div className="space-y-3.5">
        {cards.map((card) => {
          const avail = card.limit - card.debt
          const u = card.limit ? Math.round((card.debt / card.limit) * 100) : 0
          const hue = card.hue ?? 212
          return (
            <div key={card.id}>
              <div className="rounded-[20px] p-[18px] text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 28%), hsl(${hue} 50% 16%))`, boxShadow: 'var(--shadow-elevated)' }}>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold tracking-wide">{card.bank}</span>
                  <div className="w-[30px] h-[22px] rounded-[5px]" style={{ background: 'rgba(255,255,255,.25)' }} />
                </div>
                <p className="text-base tabular-nums mt-[22px] opacity-90" style={{ letterSpacing: '.18em' }}>•••• •••• •••• {card.last4}</p>
                <div className="flex justify-between items-end mt-3.5">
                  <div>
                    <p className="text-[9.5px] uppercase tracking-wider opacity-70">Güncel Borç</p>
                    <p className="text-[19px] font-extrabold tabular-nums">{tl(card.debt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9.5px] uppercase tracking-wider opacity-70">Kullanılabilir</p>
                    <p className="text-sm font-bold tabular-nums opacity-90">{tl(avail)}</p>
                  </div>
                </div>
                <div className="h-[5px] rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,.2)' }}>
                  <div className="h-full" style={{ width: `${u}%`, background: '#fff', opacity: 0.85 }} />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {[['Asgari', tl(card.min), 'warning'], ['Hesap kesim', `${card.statementDay}. gün`, ''], ['Son ödeme', `${card.dueDay}. gün`, 'danger']].map(([l, val, col]) => (
                  <div key={l as string} className="fintech-card flex-1 px-2.5 py-2">
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{l}</p>
                    <p className="text-[12.5px] font-bold tabular-nums mt-0.5" style={{ color: col ? `var(--accent-${col})` : 'var(--text-primary)' }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
