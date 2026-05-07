'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { Mail, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'

import { createUserAction, deleteUserAction, sendSmtpTestEmailAction } from '@/app/admin/actions'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import FormMessage from '@/components/ui/FormMessage'
import SubmitButton from '@/components/ui/SubmitButton'

interface ManagedUserRow {
    id: string
    email: string
    name: string | null
    role: 'USER' | 'SUPERUSER'
    isActive: boolean
    lastLoginAt: string | null
    createdAt: string
    dataCount: number
}

interface Props {
    users: ManagedUserRow[]
    currentUserId: string
    currentUserEmail: string
    smtpStatus: {
        configured: boolean
        host: string | null
        port: number | null
        from: string | null
        missing: string[]
    }
}

export default function AdminUsersWorkspace({ users, currentUserId, currentUserEmail, smtpStatus }: Props) {
    const [createState, createAction] = useActionState(createUserAction, EMPTY_ACTION_RESULT)
    const [smtpState, smtpAction] = useActionState(sendSmtpTestEmailAction, EMPTY_ACTION_RESULT)
    const [deleteState, setDeleteState] = useState<ActionResult>(EMPTY_ACTION_RESULT)
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    const totals = useMemo(() => ({
        users: users.length,
        superusers: users.filter((user) => user.role === 'SUPERUSER').length,
        records: users.reduce((sum, user) => sum + user.dataCount, 0),
    }), [users])

    function handleDelete(user: ManagedUserRow) {
        const label = user.name || user.email
        if (!window.confirm(`${label} kullanıcısı ve bağlı tüm finans verileri silinsin mi?`)) {
            return
        }

        setPendingDeleteId(user.id)
        startTransition(async () => {
            const result = await deleteUserAction(user.id)
            setDeleteState(result)
            setPendingDeleteId(null)
        })
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Kullanıcı</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{totals.users}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Superuser</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent-success)' }}>{totals.superusers}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>Bağlı kayıt</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--accent-info)' }}>{totals.records}</p>
                </div>
                <div className="fintech-card p-5">
                    <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>SMTP</p>
                    <p className="text-xl font-bold" style={{ color: smtpStatus.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                        {smtpStatus.configured ? 'Aktif' : 'Pasif'}
                    </p>
                    <p className="text-xs mt-2 truncate" style={{ color: 'var(--text-muted)' }}>
                        {smtpStatus.configured ? `${smtpStatus.host}:${smtpStatus.port}` : smtpStatus.missing.join(', ')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
                <div className="space-y-6">
                    <section className="fintech-card p-6 h-fit">
                        <div className="flex items-center gap-3 mb-6">
                            <UserPlus className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Yeni kullanıcı</h2>
                        </div>

                        <form action={createAction} className="space-y-4">
                            <div>
                                <label className="form-label">Ad Soyad</label>
                                <input name="name" className="form-input" placeholder="Arkadaşının adı" />
                            </div>
                            <div>
                                <label className="form-label">E-posta</label>
                                <input name="email" type="email" className="form-input" placeholder="ornek@domain.com" required />
                            </div>
                            <div>
                                <label className="form-label">Geçici şifre</label>
                                <input name="password" type="password" className="form-input" minLength={8} required />
                            </div>
                            <div>
                                <label className="form-label">Rol</label>
                                <select name="role" defaultValue="USER" className="form-input">
                                    <option value="USER">Kullanıcı</option>
                                    <option value="SUPERUSER">Superuser</option>
                                </select>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                SMTP aktifse giriş bilgileri otomatik olarak kullanıcıya e-posta ile gönderilir.
                            </p>
                            <FormMessage success={createState.success} message={createState.message} />
                            <SubmitButton label="Kullanıcı Oluştur" pendingLabel="Oluşturuluyor..." />
                        </form>
                    </section>

                    <section className="fintech-card p-6 h-fit">
                        <div className="flex items-center gap-3 mb-5">
                            <Mail className="w-5 h-5" style={{ color: smtpStatus.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>SMTP sistemi</h2>
                        </div>

                        <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                            <p className="text-sm font-semibold" style={{ color: smtpStatus.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                {smtpStatus.configured ? 'Mail gönderimi hazır' : 'SMTP env değerleri eksik'}
                            </p>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                {smtpStatus.configured
                                    ? `${smtpStatus.from} üzerinden ${smtpStatus.host}:${smtpStatus.port}`
                                    : smtpStatus.missing.join(', ')}
                            </p>
                        </div>

                        <form action={smtpAction} className="space-y-4">
                            <div>
                                <label className="form-label">Test e-postası</label>
                                <input
                                    name="testEmail"
                                    type="email"
                                    className="form-input"
                                    defaultValue={currentUserEmail}
                                    disabled={!smtpStatus.configured}
                                    required
                                />
                            </div>
                            <FormMessage success={smtpState.success} message={smtpState.message} />
                            <SubmitButton
                                label="Test Maili Gönder"
                                pendingLabel="Gönderiliyor..."
                                className="btn-secondary w-full inline-flex items-center justify-center gap-2"
                            />
                        </form>
                    </section>
                </div>

                <section className="fintech-card overflow-hidden">
                    <div className="p-6 flex items-center justify-between gap-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <div className="flex items-center gap-3">
                            <UsersRound className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Kullanıcılar</h2>
                        </div>
                    </div>

                    <div className="p-6">
                        <FormMessage success={deleteState.success} message={deleteState.message} />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                                    <th className="text-left font-semibold px-6 py-3">Kullanıcı</th>
                                    <th className="text-left font-semibold px-6 py-3">Rol</th>
                                    <th className="text-left font-semibold px-6 py-3">Veri</th>
                                    <th className="text-left font-semibold px-6 py-3">Son giriş</th>
                                    <th className="text-right font-semibold px-6 py-3">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const isCurrentUser = user.id === currentUserId
                                    return (
                                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name || 'İsimsiz kullanıcı'}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={user.role === 'SUPERUSER' ? 'status-badge status-badge-success' : 'status-badge status-badge-neutral'}>
                                                    {user.role === 'SUPERUSER' && <ShieldCheck className="w-3 h-3" />}
                                                    {user.role === 'SUPERUSER' ? 'Superuser' : 'Kullanıcı'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 tabular-nums" style={{ color: 'var(--text-secondary)' }}>{user.dataCount} kayıt</td>
                                            <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                                                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('tr-TR') : 'Henüz yok'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(user)}
                                                    disabled={isCurrentUser || isPending || pendingDeleteId === user.id}
                                                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                    style={{ color: 'var(--accent-danger)', background: 'var(--accent-danger-bg)' }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    {pendingDeleteId === user.id ? 'Siliniyor' : isCurrentUser ? 'Aktif hesap' : 'Sil'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    )
}
