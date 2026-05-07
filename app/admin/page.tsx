import { redirect } from 'next/navigation'

import AdminUsersWorkspace from '@/components/admin/AdminUsersWorkspace'
import PageShell from '@/components/PageShell'
import { getManagedUsers } from '@/lib/admin-users'
import { requireSuperuser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    let currentUser
    try {
        currentUser = await requireSuperuser()
    } catch {
        redirect('/')
    }

    const users = await getManagedUsers()
    const serializedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        dataCount: Object.values(user._count).reduce((sum, count) => sum + count, 0),
    }))

    return (
        <PageShell width="genis">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: 'var(--text-muted)' }}>Sistem yönetimi</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>Admin Paneli</h1>
                <p className="max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
                    Kullanıcı hesaplarını oluştur, rollerini belirle ve hesabı silerken bağlı finans verilerini izole şekilde temizle.
                </p>
            </header>

            <AdminUsersWorkspace users={serializedUsers} currentUserId={currentUser.id} />
        </PageShell>
    )
}
