'use client'

import React from 'react'
import { Home, Wallet, CreditCard, PieChart, MessageSquare, Shield, ShieldOff, MoreHorizontal } from 'lucide-react'
import { useFinance } from './FinanceContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function Navbar() {
    const { hideAmounts, toggleHideAmounts } = useFinance()
    const pathname = usePathname()

    const navItems = [
        { name: 'Dashboard', icon: Home, path: '/' },
        { name: 'Varlıklar', icon: Wallet, path: '/assets' },
        { name: 'Borçlar', icon: CreditCard, path: '/debts' },
        { name: 'Kartlarım', icon: CreditCard, path: '/cards' },
        { name: 'Abonelikler', icon: MoreHorizontal, path: '/subscriptions' },
        { name: 'Analiz', icon: PieChart, path: '/analytics' },

        { name: 'AI Koç', icon: MessageSquare, path: '/ai' },
    ]

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] p-6 z-50">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">OGZIE FINANCE</span>
                </div>

                <div className="space-y-1 mb-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                pathname === item.path
                                    ? "bg-white text-black font-semibold"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", pathname === item.path ? "text-black" : "text-zinc-500 group-hover:text-white")} />
                            {item.name}
                        </Link>
                    ))}
                </div>

                <div className="space-y-2 pt-6 border-t border-[#1a1a1a]">
                    <button
                        onClick={toggleHideAmounts}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                    >
                        {hideAmounts ? <ShieldOff className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                        {hideAmounts ? 'Tutarları Göster' : 'Gizli Mod'}
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass rounded-3xl p-2 z-50 flex items-center justify-around shadow-2xl border border-white/10">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                            "p-3 rounded-2xl transition-all duration-200",
                            pathname === item.path ? "bg-white text-black" : "text-zinc-400"
                        )}
                    >
                        <item.icon className="w-6 h-6" />
                    </Link>
                ))}
                <button
                    onClick={toggleHideAmounts}
                    className={cn(
                        "p-3 rounded-2xl transition-all duration-200",
                        hideAmounts ? "text-white" : "text-zinc-400"
                    )}
                >
                    {hideAmounts ? <ShieldOff className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                </button>
            </nav>
        </>
    )
}
