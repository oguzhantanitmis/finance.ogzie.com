'use client'

import type { Account } from '@prisma/client'

interface AccountSelectProps {
    accounts: Account[]
    name: string
    selected?: string
    required?: boolean
    label?: string
    excludeId?: string
    className?: string
}

export default function AccountSelect({
    accounts,
    name,
    selected,
    required,
    label,
    excludeId,
    className = '',
}: AccountSelectProps) {
    const filtered = excludeId ? accounts.filter((a) => a.id !== excludeId) : accounts

    return (
        <div className={className}>
            {label && <label className="block text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">{label}</label>}
            <select
                name={name}
                defaultValue={selected}
                required={required}
                className="form-input form-select"
            >
                <option value="">Hesap seçin</option>
                {filtered.map((account) => (
                    <option key={account.id} value={account.id}>
                        {account.name} ({account.currency} • {account.balance.toFixed(2)})
                    </option>
                ))}
            </select>
        </div>
    )
}
