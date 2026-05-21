'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, X, AlertTriangle, CreditCard, Activity, HelpCircle } from 'lucide-react'
import { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, generateSystemAlerts } from '@/app/actions/notification-actions'
import { BudgetAlert } from '@prisma/client'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NotificationBellProps {
    align?: 'left' | 'right' | 'sidebar'
    className?: string
    showLabel?: boolean
}

export default function NotificationBell({ align = 'right', className, showLabel = false }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<BudgetAlert[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async () => {
        setLoading(true)
        // First trigger a background check for any new system alerts (like upcoming payments)
        await generateSystemAlerts()
        
        // Then fetch unread notifications
        const res = await getUnreadNotifications()
        if (res.success && res.alerts) {
            setNotifications(res.alerts)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setNotifications(prev => prev.filter(n => n.id !== id))
        await markNotificationAsRead(id)
    }

    const handleMarkAllAsRead = async () => {
        setNotifications([])
        await markAllNotificationsAsRead()
        setIsOpen(false)
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'UPCOMING_PAYMENT': return <CreditCard className="w-4 h-4 text-amber-500" />
            case 'BUDGET_PRESSURE': return <AlertTriangle className="w-4 h-4 text-red-500" />
            case 'AI_INSIGHT': return <Activity className="w-4 h-4 text-blue-500" />
            default: return <HelpCircle className="w-4 h-4 text-zinc-400" />
        }
    }

    return (
        <div className={cn("relative", className)} ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center rounded-xl transition-all duration-200 cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                    showLabel 
                        ? "gap-3 px-3 py-2 w-full" 
                        : (align === 'sidebar' 
                            ? "justify-center p-2.5 w-full" 
                            : "justify-center w-9 h-9"
                          )
                )}
                title="Bildirimler"
            >
                <div className="relative inline-block shrink-0">
                    <Bell className="w-[18px] h-[18px]" />
                    {notifications.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse ring-2 ring-[var(--sidebar-bg)]" />
                    )}
                </div>
                {showLabel && <span className="text-[13px] font-normal">Bildirimler</span>}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                            "absolute mt-2 w-[340px] max-h-[400px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50",
                            align === 'right' && "right-0",
                            align === 'left' && "left-0",
                            align === 'sidebar' && "bottom-0 left-full ml-4"
                        )}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/50">
                            <h3 className="text-sm font-bold text-white">Bildirimler</h3>
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                                >
                                    <Check className="w-3 h-3" /> Tümünü Okundu İşaretle
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-hide p-2 flex flex-col gap-1 max-h-[300px]">
                            {loading ? (
                                <div className="text-center py-6 text-zinc-500 text-xs">Yükleniyor...</div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 text-xs flex flex-col items-center gap-2">
                                    <Bell className="w-8 h-8 opacity-20" />
                                    Okunmamış bildiriminiz yok.
                                </div>
                            ) : (
                                notifications.map(notification => (
                                    <div 
                                        key={notification.id}
                                        className="group relative flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors cursor-default"
                                    >
                                        <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-xs font-bold text-white mb-0.5">{notification.title}</p>
                                            <p className="text-[11px] text-zinc-400 leading-snug">{notification.content}</p>
                                            <span className="text-[9px] text-zinc-600 mt-2 block">
                                                {new Date(notification.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                                            className="absolute right-2 top-2 p-1.5 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-zinc-800"
                                            title="Okundu olarak işaretle"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
