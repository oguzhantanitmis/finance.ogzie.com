'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'

import CardFormModal from '@/components/cards/CardFormModal'

export default function AddCardButton() {
    const [isOpen, setIsOpen] = useState(false)

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
