'use client'

/* ============================================================
   MobileTabBar.tsx — Native mobil alt tab bar + FAB + Hızlı İşlem
   ------------------------------------------------------------
   Yerleşim: components/MobileTabBar.tsx
   Kullanım: AppShell veya layout içinde, sadece mobilde görünür
   (lg:hidden). Navbar.tsx içindeki mevcut "Mobile Bottom Quick Nav"
   <nav> bloğunu bununla DEĞİŞTİR.

   Bağımlılıklar (zaten projede var):
     - next/link, next/navigation
     - lucide-react
     - framer-motion
     - @/lib/utils -> cn
   Tüm renkler globals.css token'larından gelir (tema otomatik).
   ============================================================ */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, ArrowRightLeft, Wallet, Settings, Plus,
  ArrowDownLeft, ArrowUpRight, CreditCard, Users, Repeat, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = { name: string; short: string; icon: typeof Home; path: string }

const TABS: Tab[] = [
  { name: 'Genel Bakış', short: 'Özet', icon: Home, path: '/' },
  { name: 'İşlemler', short: 'İşlem', icon: ArrowRightLeft, path: '/transactions' },
  { name: 'Varlıklar', short: 'Varlık', icon: Wallet, path: '/assets' },
  { name: 'Ayarlar', short: 'Ayar', icon: Settings, path: '/settings' },
]

// Hızlı işlem aksiyonları — kendi "ekle" modal/route'larına bağla
const QUICK_ACTIONS = [
  { label: 'Gelir ekle', icon: ArrowDownLeft, color: 'success', href: '/transactions?new=income' },
  { label: 'Gider ekle', icon: ArrowUpRight, color: 'danger', href: '/transactions?new=expense' },
  { label: 'Borç / taksit', icon: CreditCard, color: 'warning', href: '/debts?new=1' },
  { label: 'Alacak / verecek', icon: Users, color: 'info', href: '/people?new=1' },
  { label: 'Abonelik', icon: Repeat, color: 'purple', href: '/expenses?new=1' },
  { label: 'Hedef', icon: Target, color: 'info', href: '/goals?new=1' },
] as const

export default function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [sheet, setSheet] = useState(false)

  const isActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path))

  const goQuick = (href: string) => {
    setSheet(false)
    router.push(href)
  }

  return (
    <>
      {/* ---- Hızlı İşlem Bottom Sheet ---- */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              className="lg:hidden fixed left-0 right-0 bottom-0 z-50"
              initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              style={{
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border-default)',
                borderRadius: '28px 28px 0 0',
                boxShadow: 'var(--shadow-elevated)',
                padding: '12px 18px calc(28px + env(safe-area-inset-bottom))',
              }}
            >
              <div className="mx-auto mb-3.5 h-[5px] w-10 rounded-full" style={{ background: 'var(--border-hover)' }} />
              <h3 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Hızlı İşlem</h3>
              <p className="mb-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>Ne eklemek istersin?</p>
              <div className="grid grid-cols-3 gap-3">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => goQuick(a.href)}
                    className="flex flex-col items-center gap-2 rounded-2xl px-2 py-4 transition-transform active:scale-95"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-2xl"
                      style={{ background: `var(--accent-${a.color}-bg)`, color: `var(--accent-${a.color})` }}
                    >
                      <a.icon className="h-5 w-5" />
                    </span>
                    <span className="text-center text-[11.5px] font-semibold leading-tight" style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSheet(false)}
                className="mt-4 w-full rounded-2xl py-3 font-semibold"
                style={{ background: 'var(--fab-bg, var(--accent-primary))', color: '#fff' }}
              >
                Kapat
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Alt Tab Bar ---- */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-start justify-between"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom))',
          padding: '8px 14px env(safe-area-inset-bottom)',
          background: 'var(--tabbar-bg, var(--bg-card))',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--tabbar-border, var(--border-default))',
        }}
      >
        {/* sol iki sekme */}
        {TABS.slice(0, 2).map((t) => <TabItem key={t.path} tab={t} active={isActive(t.path)} />)}

        {/* merkez FAB */}
        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setSheet((s) => !s)}
            aria-label="Hızlı işlem"
            className="-mt-[18px] flex h-[58px] w-[58px] items-center justify-center rounded-[20px] text-white transition-transform active:scale-90"
            style={{
              background: 'var(--fab-bg, var(--accent-primary))',
              boxShadow: '0 8px 20px -4px var(--fab-bg, var(--accent-primary)), 0 4px 10px rgba(0,0,0,.2)',
            }}
          >
            <motion.span animate={{ rotate: sheet ? 45 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 20 }}>
              <Plus className="h-7 w-7" />
            </motion.span>
          </button>
        </div>

        {/* sağ iki sekme */}
        {TABS.slice(2).map((t) => <TabItem key={t.path} tab={t} active={isActive(t.path)} />)}
      </nav>
    </>
  )
}

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.path}
      className={cn('flex flex-1 flex-col items-center gap-[3px] pt-2 transition-colors')}
      style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
    >
      <Icon className="h-[23px] w-[23px]" style={{ transform: active ? 'translateY(-1px)' : undefined }} />
      <span className="text-[10px] font-semibold tracking-tight">{tab.name}</span>
    </Link>
  )
}
