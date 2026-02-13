import Link from 'next/link'
import { Plus, Minus, Zap, PlayCircle } from 'lucide-react'

export default function ActionButtons() {
    const actions = [
        { name: 'Gelir Ekle', icon: Plus, path: '/assets', color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' },
        { name: 'Gider Ekle', icon: Minus, path: '/debts', color: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' },
        { name: 'AI Analiz', icon: Zap, path: '/ai', color: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' },
        { name: 'Simülasyon', icon: PlayCircle, path: '/analytics', color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {actions.map((action) => (
                <Link
                    key={action.name}
                    href={action.path}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-semibold transition-all duration-200 ${action.color}`}
                >
                    <action.icon className="w-5 h-5" />
                    {action.name}
                </Link>
            ))}
        </div>
    )
}

