'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'

import CardFormModal from '@/components/cards/CardFormModal'

export default function AddCardButton() {
    const [isOpen, setIsOpen] = useState(false)

    // Hızlı işlem derin bağlantısı: /cards?new=1 → kart ekleme modalını aç
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    useEffect(() => {
        if (!searchParams.get('new')) return
        const timeoutId = window.setTimeout(() => setIsOpen(true), 0)
        router.replace(pathname, { scroll: false })
        return () => window.clearTimeout(timeoutId)
    }, [searchParams, router, pathname])

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-all text-sm"
            >
                <Plus className="w-4 h-4" /> Yeni Kart
            </button>

            {isOpen ? <CardFormModal card={null} onClose={() => setIsOpen(false)} /> : null}
        </>
    )
}
