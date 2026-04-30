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
    className = 'btn-primary w-full',
}: SubmitButtonProps) {
    const { pending } = useFormStatus()

    return (
        <button type="submit" disabled={pending} className={className}>
            {pending ? pendingLabel : label}
        </button>
    )
}
