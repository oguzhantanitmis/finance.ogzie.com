'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sun, Moon, Shield, ShieldOff, Settings, LogOut, ChevronDown, PanelLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { signOut, useSession } from 'next-auth/react'
import { useFinance } from './FinanceContext'
import { useTheme } from './ThemeProvider'
import { useSidebar } from './SidebarContext'
import NotificationBell from '@/components/notifications/NotificationBell'
import { cn } from '@/lib/utils'

const ICON_BTN = cn(
    'flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer transition-colors duration-200',
    'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)]',
    'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
)

/**
 * Masaüstü içerik alanının üst barı:
 *   sol → kenar çubuğunu daralt/genişlet
 *   sağ → tema · gizli mod · bildirim · | · hesap menüsü
 * Mobilde gizli — orada Navbar'ın kendi üst barı devrede.
 */
export default function TopBar() {
    const { hideAmounts, toggleHideAmounts } = useFinance()
    const { theme, toggleTheme } = useTheme()
    const { collapsed, toggleCollapsed } = useSidebar()
    const { data: session } = useSession()

    const [accountOpen, setAccountOpen] = useState(false)
    const accountRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
                setAccountOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Açıkken Escape ile kapat ve odağı tetikleyici butona geri ver.
    useEffect(() => {
        if (!accountOpen) return
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setAccountOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [accountOpen])

    // Menü açılınca odağı ilk öğeye taşı (ARIA menu pattern).
    useEffect(() => {
        if (!accountOpen) return
        const id = requestAnimationFrame(() => {
            menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
        })
        return () => cancelAnimationFrame(id)
    }, [accountOpen])

    // Ok tuşları / Home / End ile menü öğeleri arasında dolaş.
    function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
        if (!items.length) return
        const idx = items.indexOf(document.activeElement as HTMLElement)
        if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus() }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus() }
        else if (e.key === 'Home') { e.preventDefault(); items[0].focus() }
        else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus() }
    }

    const email = session?.user?.email ?? ''
    const fullName = session?.user?.name?.trim() || email.split('@')[0] || 'Hesap'
    const initial = (fullName[0] || 'H').toUpperCase()

    return (
        <header
            className="hidden lg:block sticky top-0 z-40"
            style={{
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-default)',
            }}
        >
            <div className="mx-auto w-full max-w-[var(--content-max)] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
                <div className="flex items-center justify-between gap-2 h-16">
                    {/* Sol: kenar çubuğunu daralt / genişlet */}
                    <button
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Genişlet' : 'Daralt'}
                        aria-label={collapsed ? 'Kenar çubuğunu genişlet' : 'Kenar çubuğunu daralt'}
                        aria-expanded={!collapsed}
                        className={ICON_BTN}
                    >
                        <PanelLeft className="w-[18px] h-[18px]" />
                    </button>

                    {/* Sağ: kontrol kümesi */}
                    <div className="flex items-center gap-2">
                    {/* Tema */}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                        aria-label={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
                        className={ICON_BTN}
                    >
                        {theme === 'dark'
                            ? <Sun className="w-[18px] h-[18px]" />
                            : <Moon className="w-[18px] h-[18px]" />}
                    </button>

                    {/* Gizli Mod */}
                    <button
                        onClick={toggleHideAmounts}
                        title={hideAmounts ? 'Tutarları Göster' : 'Gizli Mod'}
                        aria-label={hideAmounts ? 'Tutarları göster' : 'Gizli mod'}
                        className={cn(
                            ICON_BTN,
                            hideAmounts && 'text-[var(--accent-warning)] hover:text-[var(--accent-warning)]'
                        )}
                    >
                        {hideAmounts
                            ? <ShieldOff className="w-[18px] h-[18px]" />
                            : <Shield className="w-[18px] h-[18px]" />}
                    </button>

                    {/* Bildirimler */}
                    <NotificationBell align="right" buttonClassName={ICON_BTN} />

                    {/* Ayraç */}
                    <div
                        className="w-px h-6 mx-1 shrink-0"
                        style={{ background: 'var(--border-default)' }}
                    />

                    {/* Hesap */}
                    <div className="relative" ref={accountRef}>
                        <button
                            ref={triggerRef}
                            onClick={() => setAccountOpen((v) => !v)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-full border pl-1.5 pr-3 py-1.5 cursor-pointer transition-colors duration-200',
                                'bg-[var(--bg-elevated)] border-[var(--border-default)] hover:bg-[var(--bg-hover)]'
                            )}
                            aria-haspopup="menu"
                            aria-expanded={accountOpen}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 relative overflow-hidden"
                                style={{ background: 'var(--accent-primary)', color: '#fff' }}
                            >
                                <span className="relative z-10">{initial}</span>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            </div>
                            <div className="text-left leading-tight min-w-0 max-w-[140px]">
                                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {fullName}
                                </div>
                                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                    Hesap
                                </div>
                            </div>
                            <ChevronDown
                                className={cn('w-4 h-4 shrink-0 transition-transform duration-200', accountOpen && 'rotate-180')}
                                style={{ color: 'var(--text-muted)' }}
                            />
                        </button>

                        <AnimatePresence>
                            {accountOpen && (
                                <motion.div
                                    ref={menuRef}
                                    role="menu"
                                    aria-orientation="vertical"
                                    onKeyDown={onMenuKeyDown}
                                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                    transition={{ duration: 0.18 }}
                                    className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl overflow-hidden z-50"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                                >
                                    {/* Profil */}
                                    <div
                                        className="flex items-center gap-3 px-4 py-3.5"
                                        style={{ borderBottom: '1px solid var(--border-default)' }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative overflow-hidden"
                                            style={{ background: 'var(--accent-primary)', color: '#fff' }}
                                        >
                                            <span className="relative z-10">{initial}</span>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                {fullName}
                                            </p>
                                            {email && (
                                                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                    {email}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ayarlar */}
                                    <div className="p-1.5">
                                        <Link
                                            href="/settings"
                                            role="menuitem"
                                            tabIndex={-1}
                                            onClick={() => setAccountOpen(false)}
                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] transition-colors cursor-pointer hover:bg-[var(--bg-hover)] focus:bg-[var(--bg-hover)] focus:outline-none"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Settings className="w-[18px] h-[18px] shrink-0" />
                                            <span>Ayarlar</span>
                                        </Link>
                                    </div>

                                    {/* Çıkış */}
                                    <div className="p-1.5" style={{ borderTop: '1px solid var(--border-default)' }}>
                                        <button
                                            role="menuitem"
                                            tabIndex={-1}
                                            onClick={() => {
                                                setAccountOpen(false)
                                                signOut({ callbackUrl: '/login' })
                                            }}
                                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] transition-colors cursor-pointer hover:bg-[var(--accent-danger-bg)] focus:bg-[var(--accent-danger-bg)] focus:outline-none"
                                            style={{ color: 'var(--accent-danger)' }}
                                        >
                                            <LogOut className="w-[18px] h-[18px] shrink-0" />
                                            <span>Çıkış Yap</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
