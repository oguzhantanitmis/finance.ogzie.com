import { redirect } from 'next/navigation'

import AdminUsersWorkspace from '@/components/admin/AdminUsersWorkspace'
import AdminAITokens, { type AITokenUser } from '@/components/admin/AdminAITokens'
import PageShell from '@/components/PageShell'
import { getManagedUsers } from '@/lib/admin-users'
import { currentPeriod } from '@/lib/ai-usage'
import { getSmtpStatus } from '@/lib/email/smtp'
import { prisma } from '@/lib/prisma'
import { requireSuperuser } from '@/lib/server-auth'

import { updateAiLimitAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    let currentUser
    try {
        currentUser = await requireSuperuser()
    } catch {
        redirect('/')
    }

    const users = await getManagedUsers()
    const smtpStatus = getSmtpStatus()

    // AI token kullanımı — içinde bulunulan ay
    const period = currentPeriod()
    const aiUsers = await prisma.user.findMany({
        where: { deletedAt: null },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            aiMonthlyTokenLimit: true,
            aiUsages: { where: { period }, select: { totalTokens: true, costUsd: true, requests: true } },
        },
    })
    const aiRows: AITokenUser[] = aiUsers.map((u) => ({
        id: u.id,
        name: u.name ?? u.email,
        email: u.email,
        role: u.role === 'SUPERUSER' ? 'SUPERUSER' : 'USER',
        used: u.aiUsages[0]?.totalTokens ?? 0,
        limit: u.aiMonthlyTokenLimit ?? 0,
        costUsd: u.aiUsages[0]?.costUsd ?? 0,
        requests: u.aiUsages[0]?.requests ?? 0,
    }))
    const monthLabel = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    const serializedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        lastLoginIp: user.lastLoginIp ?? null,
        failedLoginAttempts: user.failedLoginAttempts ?? 0,
        isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false,
        lockedUntil: user.lockedUntil?.toISOString() ?? null,
        sessionVersion: user.sessionVersion ?? 1,
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

            <AdminUsersWorkspace users={serializedUsers} currentUserId={currentUser.id} currentUserEmail={currentUser.email} smtpStatus={smtpStatus} />

            <div className="mt-12">
                <AdminAITokens users={aiRows} month={monthLabel} onUpdateLimit={updateAiLimitAction} />
            </div>
        </PageShell>
    )
}
