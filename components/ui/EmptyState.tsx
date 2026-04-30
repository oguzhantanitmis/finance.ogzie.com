import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick: () => void
    }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="empty-state fintech-card">
            <div className="empty-state-icon">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-description">{description}</p>
            {action ? (
                <button
                    onClick={action.onClick}
                    className="btn-primary mt-4"
                >
                    {action.label}
                </button>
            ) : null}
        </div>
    )
}
