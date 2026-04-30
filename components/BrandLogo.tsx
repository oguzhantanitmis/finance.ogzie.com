'use client'

import Image from 'next/image'

type BrandLogoProps = {
    name: string
    src?: string | null
    color?: string
    size?: number
}

export default function BrandLogo({ name, src, color = '#27272A', size = 56 }: BrandLogoProps) {
    const initials = name
        .split(' ')
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2)

    if (!src) {
        return (
            <div
                className="rounded-2xl border border-[var(--border-default)] flex items-center justify-center text-sm font-bold text-white"
                style={{ width: size, height: size, backgroundColor: color }}
            >
                {initials || 'OS'}
            </div>
        )
    }

    return (
        <div
            className="rounded-2xl border border-[var(--border-default)] overflow-hidden flex items-center justify-center bg-black/30"
            style={{ width: size, height: size }}
        >
            <Image
                src={src}
                alt={name}
                width={size}
                height={size}
                className="w-full h-full object-cover"
                unoptimized
            />
        </div>
    )
}
