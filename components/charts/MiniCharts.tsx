'use client'

/* ============================================================
   charts.tsx — Bağımsız inline-SVG grafikler (token tabanlı)
   ------------------------------------------------------------
   Yerleşim: components/charts/MiniCharts.tsx
   Bağımlılık yok. Renkler globals.css accent token'larından gelir
   (accent adı geçilir: 'info' | 'success' | 'danger' | 'warning' | 'purple').
   Not: Projede recharts var; bu hafif primitifler mobil kartlar için
   daha küçük/öngörülebilir. İstersen recharts ile değiştirebilirsin.
   ============================================================ */

import type { ReactNode } from 'react'

import { formatTryAmountCompact } from '@/lib/display-currency'

export type Accent = 'info' | 'success' | 'danger' | 'warning' | 'purple'
const v = (a: Accent) => `var(--accent-${a})`

export function Donut({
  segments, size = 132, thickness = 16, center,
}: {
  segments: { value: number; color: Accent }[]
  size?: number; thickness?: number; center?: ReactNode
}) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const lens = segments.map((s) => (s.value / total) * c)
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0))
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={thickness} />
        {segments.map((s, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={v(s.color)}
            strokeWidth={thickness} strokeDasharray={`${lens[i]} ${c - lens[i]}`} strokeDashoffset={-offsets[i]} />
        ))}
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {center}
        </div>
      )}
    </div>
  )
}

export function DualBars({
  labels, a, b, colorA = 'success', colorB = 'danger', height = 150,
}: {
  labels: string[]; a: number[]; b: number[]
  colorA?: Accent; colorB?: Accent; height?: number
}) {
  const max = Math.max(...a, ...b) || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
      {labels.map((l, i) => (
        <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' }}>
            <div style={{ flex: 1, height: `${(a[i] / max) * 100}%`, background: v(colorA), borderRadius: '4px 4px 0 0', minHeight: 3 }} />
            <div style={{ flex: 1, height: `${(b[i] / max) * 100}%`, background: v(colorB), borderRadius: '4px 4px 0 0', minHeight: 3, opacity: 0.85 }} />
          </div>
          <span style={{ fontSize: 10.5, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

export function Spark({
  data, color = 'info', height = 64, fillArea = true,
}: {
  data: number[]; color?: Accent; height?: number; fillArea?: boolean
}) {
  const w = 300, h = height, pad = 6
  const max = Math.max(...data), min = Math.min(...data, 0)
  const span = (max - min) || 1
  const pts = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = h - pad - ((val - min) / span) * (h - pad * 2)
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fillArea && <path d={area} fill={`var(--accent-${color}-bg)`} />}
      <path d={line} fill="none" stroke={v(color)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={v(color)} />
    </svg>
  )
}

/** Yardımcı: tutar biçimlendirme — kullanıcının ana para birimine çevirir */
export function tl(n: number) {
  return formatTryAmountCompact(n)
}

/** Dairesel skor göstergesi (0-100) — eşiklere göre renklenir */
export function Gauge({ score, size = 128 }: { score: number; size?: number }) {
  const r = 40, c = 2 * Math.PI * r, off = c - (score / 100) * c
  const col = score >= 80 ? v('success') : score >= 60 ? v('info') : score >= 40 ? v('warning') : v('danger')
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="9" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>/ 100</span>
      </div>
    </div>
  )
}
