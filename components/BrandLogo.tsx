'use client'

import { useState } from 'react'
import Image from 'next/image'
import { brandLogoCandidates } from '@/lib/logo-utils'

type BrandLogoProps = {
    name: string
    src?: string | null
    color?: string
    size?: number
}

export default function BrandLogo({ name, src, color = '#27272A', size = 56 }: BrandLogoProps) {
    // Denenecek logo kaynakları (favicon → DuckDuckGo → Clearbit → kayıtlı src).
    // Bilinen markalar isimden tazelendiği için eski/yanlış (globe dönen) logoUrl'ler
    // geçersiz kalır.
    const candidates = brandLogoCandidates(name, src)
    const [idx, setIdx] = useState(0)
    const current = candidates[idx]

    const initials = name
        .split(' ')
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2)

    // Hiç kaynak yok ya da tüm kaynaklar denenip tükendi → baş harf rozeti.
    if (!current) {
        return (
            <div
                className="rounded-2xl border border-[var(--border-default)] flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ width: size, height: size, backgroundColor: color }}
            >
                {initials || 'OS'}
            </div>
        )
    }

    // Beyaz tile + object-contain: koyu/tek renk logolar (OpenAI, Notion vb.)
    // koyu temada da net görünür ve logo kırpılmaz.
    return (
        <div
            className="rounded-2xl border border-[var(--border-default)] overflow-hidden flex items-center justify-center bg-white shrink-0"
            style={{ width: size, height: size, padding: Math.max(4, Math.round(size * 0.14)) }}
        >
            <Image
                key={current}
                src={current}
                alt={name}
                width={size}
                height={size}
                className="w-full h-full object-contain"
                onError={() => setIdx((i) => i + 1)}
                unoptimized
            />
        </div>
    )
}
