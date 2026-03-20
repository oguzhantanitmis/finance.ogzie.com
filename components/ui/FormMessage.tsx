'use client'

interface FormMessageProps {
    success?: boolean
    message?: string
}

export default function FormMessage({ success, message }: FormMessageProps) {
    if (!message) {
        return null
    }

    return (
        <div
            className={`rounded-2xl border px-4 py-3 text-sm ${success
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
        >
            {message}
        </div>
    )
}
