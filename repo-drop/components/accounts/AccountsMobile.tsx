'use client'

/* ============================================================
   AccountsMobile.tsx — Hesaplar (mobil-native)
   Yerleşim: components/accounts/AccountsMobile.tsx
   ============================================================ */

import { Landmark, Wallet, Gauge } from 'lucide-react'
import { tl } from '@/components/charts/MiniCharts'

export type AccountType = 'bank' | 'cash' | 'kmh'
export interface AccountItem {
  id: string; name: string; type: AccountType; bank: string
  balance: number; kmhLimit?: number
}

const ICON: Record<AccountType, typeof Landmark> = { bank: Landmark, cash: Wallet, kmh: Gauge }
const ACCENT: Record<AccountType, string> = { bank: 'info', cash: 'success', kmh: 'warning' }
const LABEL: Record<AccountType, string> = { bank: 'Banka Hesabı', cash: 'Nakit', kmh: 'Esnek Hesap (KMH)' }

export default function AccountsMobile({ accounts }: { accounts: AccountItem[] }) {
  const cashTotal = accounts.filter((x) => x.type !== 'kmh').reduce((s, x) => s + x.balance, 0)
  const kmhCount = accounts.filter((x) => x.type === 'kmh').length

  return (
    <div className="space-y-4">
      <div className="fintech-card p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Kullanılabilir Nakit</p>
        <p className="text-[34px] font-extrabold tabular-nums my-1.5" style={{ color: 'var(--text-primary)' }}>{tl(cashTotal)}</p>
        <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{accounts.length - kmhCount} hesap · {kmhCount} esnek hesap</p>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Hesaplarım</h3>
        <button className="text-[12.5px] font-semibold" style={{ color: 'var(--accent-primary)' }}>Hesap Ekle</button>
      </div>

      <div className="space-y-2.5">
        {accounts.map((acc) => {
          const Icon = ICON[acc.type]
          const neg = acc.balance < 0
          const kmhUse = acc.type === 'kmh' && acc.kmhLimit ? Math.round((Math.abs(acc.balance) / acc.kmhLimit) * 100) : 0
          return (
            <div key={acc.id} className={`fintech-card p-[15px] ${neg ? 'kpi-card kpi-card-warning' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-[42px] h-[42px] rounded-[13px] shrink-0 flex items-center justify-center"
                  style={{ background: `var(--accent-${ACCENT[acc.type]}-bg)`, color: `var(--accent-${ACCENT[acc.type]})` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{acc.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{acc.bank} · {LABEL[acc.type]}</p>
                </div>
                <p className="text-base font-extrabold tabular-nums" style={{ color: neg ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{tl(acc.balance)}</p>
              </div>
              {acc.type === 'kmh' && acc.kmhLimit && (
                <>
                  <div className="progress-bar progress-bar-warning mt-3"><div className="progress-bar-fill" style={{ width: `${kmhUse}%` }} /></div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>KMH kullanımı %{kmhUse}</span>
                    <span className="text-[11.5px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>limit {tl(acc.kmhLimit)}</span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
