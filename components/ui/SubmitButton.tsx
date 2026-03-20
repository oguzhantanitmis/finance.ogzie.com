'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
    label: string
    pendingLabel?: string
    className?: string
}

export default function SubmitButton({
    label,
    pendingLabel = 'Kaydediliyor...',
    className = 'w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-60',
}: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <button type="submit" disabled={pending} className={className}>
            {pending ? pendingLabel : label}
        </button>
    )
}
