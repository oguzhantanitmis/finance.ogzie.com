'use client'

import { Home, Wallet, CreditCard, PieChart, MessageSquare, Shield, ShieldOff, MoreHorizontal, Repeat, ReceiptText, LogOut } from 'lucide-react'
import { useFinance } from './FinanceContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

export default function Navbar() {
    const { hideAmounts, toggleHideAmounts } = useFinance()
    const pathname = usePathname()

    const navItems = [
        { name: 'Genel Bakış', icon: Home, path: '/' },
        { name: 'Varlıklar', icon: Wallet, path: '/assets' },
        { name: 'Borçlar', icon: CreditCard, path: '/debts' },
        { name: 'Kartlarım', icon: CreditCard, path: '/cards' },
        { name: 'Abonelikler', icon: MoreHorizontal, path: '/subscriptions' },
        { name: 'Sabit Giderler', icon: Repeat, path: '/recurring' },
        { name: 'Bütçe', icon: ReceiptText, path: '/budget' },
        { name: 'Analiz', icon: PieChart, path: '/analytics' },

        { name: 'Finans Asistanı', icon: MessageSquare, path: '/ai' },
    ]

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-72 bg-[#0a0a0a] border-r border-[#1a1a1a] p-6 z-50">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <div className="w-4 h-4 bg-black rounded-sm" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">OGZIE FINANS</span>
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
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Çıkış Yap
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] glass rounded-3xl p-2 z-50 flex items-center gap-1 overflow-x-auto shadow-2xl border border-white/10">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={cn(
                            "p-3 rounded-2xl transition-all duration-200 shrink-0",
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
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="p-3 rounded-2xl transition-all duration-200 shrink-0 text-zinc-400"
                    aria-label="Çıkış yap"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </nav>
        </>
    )
}
