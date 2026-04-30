'use client'

import { useState } from 'react'
import {
    Home, Wallet, CreditCard, PieChart, MessageSquare, Shield, ShieldOff,
    MoreHorizontal, Repeat, ReceiptText, LogOut, Landmark, Users, BookOpen,
    Target, BarChart3, Activity, Wand2, Settings, Sun, Moon, Menu, X,
    ChevronLeft, ChevronRight, Banknote,
} from 'lucide-react'
import { useFinance } from './FinanceContext'
import { useTheme } from './ThemeProvider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

export default function Navbar() {
    const { hideAmounts, toggleHideAmounts } = useFinance()
    const { theme, toggleTheme } = useTheme()
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    const navGroups = [
        {
            title: 'Ana Menü',
            items: [
                { name: 'Genel Bakış', icon: Home, path: '/' },
                { name: 'Varlıklar', icon: Wallet, path: '/assets' },
                { name: 'Hesaplar', icon: Landmark, path: '/accounts' },
                { name: 'Kişiler', icon: Users, path: '/people' },
            ]
        },
        {
            title: 'İşlemler',
            items: [
                { name: 'İşlemler', icon: BookOpen, path: '/transactions' },
                { name: 'Borçlar', icon: CreditCard, path: '/debts' },
                { name: 'Kartlarım', icon: CreditCard, path: '/cards' },
                { name: 'Abonelikler', icon: MoreHorizontal, path: '/subscriptions' },
                { name: 'Sabit Giderler', icon: Repeat, path: '/recurring' },
            ]
        },
        {
            title: 'Planlama',
            items: [
                { name: 'Bütçe', icon: ReceiptText, path: '/budget' },
                { name: 'Ödeme Planı', icon: CreditCard, path: '/payment-plan' },
                { name: 'Hedefler', icon: Target, path: '/goals' },
                { name: 'Komisyonlar', icon: Banknote, path: '/commissions' },
            ]
        },
        {
            title: 'Analiz',
            items: [
                { name: 'Raporlar', icon: BarChart3, path: '/reports' },
                { name: 'Sağlık Puanı', icon: Activity, path: '/health' },
                { name: 'Genel Analiz', icon: PieChart, path: '/analytics' },
                { name: 'Simülasyon', icon: Wand2, path: '/simulations' },
            ]
        },
        {
            title: 'Sistem',
            items: [
                { name: 'Finans Asistanı', icon: MessageSquare, path: '/ai' },
                { name: 'Ayarlar', icon: Settings, path: '/settings' },
            ]
        }
    ]

    const mobileQuickLinks = [
        { name: 'Genel Bakış', icon: Home, path: '/' },
        { name: 'İşlemler', icon: BookOpen, path: '/transactions' },
        { name: 'Borçlar', icon: CreditCard, path: '/debts' },
        { name: 'Kişiler', icon: Users, path: '/people' },
        { name: 'Raporlar', icon: BarChart3, path: '/reports' },
    ]

    return (
        <>
            {/* ============================================================ */}
            {/* DESKTOP SIDEBAR                                              */}
            {/* ============================================================ */}
            <nav
                className={cn(
                    "hidden lg:flex flex-col fixed left-0 top-0 h-full z-50 transition-all duration-300",
                    collapsed ? "w-[72px]" : "w-[var(--sidebar-width)]"
                )}
                style={{
                    background: 'var(--sidebar-bg)',
                    borderRight: '1px solid var(--sidebar-border)',
                }}
            >
                {/* Logo */}
                <div className={cn(
                    "flex items-center gap-3 shrink-0 transition-all duration-300",
                    collapsed ? "px-4 py-6 justify-center" : "px-6 py-6"
                )}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                        style={{ background: 'var(--accent-primary)' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                        <span className="text-white font-bold text-sm relative z-10">O</span>
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <span className="font-bold text-lg tracking-tight block" style={{ color: 'var(--text-primary)' }}>
                                OGZIE
                            </span>
                            <span className="text-[10px] font-medium tracking-[0.2em] uppercase block -mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                Finans
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Groups */}
                <div className={cn(
                    "flex-1 overflow-y-auto scrollbar-hide pb-4",
                    collapsed ? "px-2" : "px-3"
                )}>
                    {navGroups.map((group, idx) => (
                        <div key={idx} className="mb-4">
                            {!collapsed && (
                                <h3
                                    className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2 px-3"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {group.title}
                                </h3>
                            )}
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                                    return (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            title={collapsed ? item.name : undefined}
                                            className={cn(
                                                "flex items-center rounded-xl transition-all duration-200 group relative cursor-pointer",
                                                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                                                isActive
                                                    ? "font-semibold"
                                                    : "hover:bg-[var(--bg-hover)]"
                                            )}
                                            style={isActive ? {
                                                background: 'var(--text-primary)',
                                                color: 'var(--text-inverse)',
                                            } : {
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {isActive && (
                                                <div
                                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                                    style={{
                                                        background: 'var(--accent-primary)',
                                                        left: collapsed ? '-8px' : '-12px',
                                                    }}
                                                />
                                            )}
                                            <item.icon className={cn(
                                                "w-[18px] h-[18px] shrink-0 transition-colors",
                                                isActive ? "" : "group-hover:text-[var(--text-primary)]"
                                            )} />
                                            {!collapsed && (
                                                <span className="text-[13px] truncate">{item.name}</span>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Actions */}
                <div
                    className={cn("shrink-0 space-y-1", collapsed ? "px-2 py-3" : "px-3 py-3")}
                    style={{ borderTop: '1px solid var(--border-default)' }}
                >
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
                        className={cn(
                            "flex items-center rounded-xl w-full transition-all duration-200 cursor-pointer",
                            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                        )}
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
                        {!collapsed && <span className="text-[13px]">{theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}</span>}
                    </button>

                    {/* Privacy Toggle */}
                    <button
                        onClick={toggleHideAmounts}
                        title={hideAmounts ? 'Tutarları Göster' : 'Gizli Mod'}
                        className={cn(
                            "flex items-center rounded-xl w-full transition-all duration-200 cursor-pointer",
                            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                        )}
                        style={{ color: hideAmounts ? 'var(--accent-warning)' : 'var(--text-secondary)' }}
                    >
                        {hideAmounts
                            ? <ShieldOff className="w-[18px] h-[18px]" />
                            : <Shield className="w-[18px] h-[18px]" />
                        }
                        {!collapsed && <span className="text-[13px]">{hideAmounts ? 'Tutarları Göster' : 'Gizli Mod'}</span>}
                    </button>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        title={collapsed ? 'Genişlet' : 'Daralt'}
                        className={cn(
                            "flex items-center rounded-xl w-full transition-all duration-200 cursor-pointer",
                            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                        )}
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {collapsed
                            ? <ChevronRight className="w-[18px] h-[18px]" />
                            : <ChevronLeft className="w-[18px] h-[18px]" />
                        }
                        {!collapsed && <span className="text-[13px]">Daralt</span>}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        title="Çıkış Yap"
                        className={cn(
                            "flex items-center rounded-xl w-full transition-all duration-200 cursor-pointer",
                            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                        )}
                        style={{ color: 'var(--accent-danger)' }}
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        {!collapsed && <span className="text-[13px]">Çıkış Yap</span>}
                    </button>
                </div>
            </nav>

            {/* ============================================================ */}
            {/* MOBILE TOP BAR + HAMBURGER                                   */}
            {/* ============================================================ */}
            <div
                className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
                style={{
                    background: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border-default)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
                        <span className="text-white font-bold text-sm">O</span>
                    </div>
                    <span className="font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        OGZIE
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleTheme}
                        className="btn-icon"
                        aria-label={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={toggleHideAmounts}
                        className="btn-icon"
                        aria-label={hideAmounts ? 'Tutarları göster' : 'Gizli mod'}
                        style={hideAmounts ? { color: 'var(--accent-warning)' } : undefined}
                    >
                        {hideAmounts ? <ShieldOff className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="btn-icon"
                        aria-label="Menü"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="absolute top-[57px] left-0 right-0 bottom-0 overflow-y-auto py-4 px-3"
                        style={{ background: 'var(--bg-primary)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {navGroups.map((group, idx) => (
                            <div key={idx} className="mb-4">
                                <h3
                                    className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2 px-3"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {group.title}
                                </h3>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                                        return (
                                            <Link
                                                key={item.path}
                                                href={item.path}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                                                    isActive ? "font-semibold" : ""
                                                )}
                                                style={isActive ? {
                                                    background: 'var(--text-primary)',
                                                    color: 'var(--text-inverse)',
                                                } : {
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                <item.icon className="w-5 h-5 shrink-0" />
                                                <span className="text-sm">{item.name}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}

                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button
                                onClick={() => { signOut({ callbackUrl: '/login' }); setMobileMenuOpen(false) }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all"
                                style={{ color: 'var(--accent-danger)' }}
                            >
                                <LogOut className="w-5 h-5" />
                                <span className="text-sm">Çıkış Yap</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Quick Nav */}
            <nav
                className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
                style={{
                    background: 'var(--bg-card)',
                    borderTop: '1px solid var(--border-default)',
                }}
            >
                {mobileQuickLinks.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px]",
                                isActive ? "font-medium" : ""
                            )}
                            style={isActive
                                ? { color: 'var(--accent-primary)' }
                                : { color: 'var(--text-muted)' }
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px]">{item.name.split(' ')[0]}</span>
                        </Link>
                    )
                })}
            </nav>
        </>
    )
}
