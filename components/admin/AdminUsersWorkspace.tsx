'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import {
    AlertTriangle, CheckCircle2, Lock, LogOut, Mail, RefreshCw,
    ShieldCheck, ShieldOff, Trash2, UserPlus, Users,
} from 'lucide-react'

import {
    createUserAction, deleteUserAction, sendSmtpTestEmailAction,
    resetUserSessionsAction, unlockUserAction,
} from '@/app/admin/actions'
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
    lastLoginIp: string | null
    failedLoginAttempts: number
    isLocked: boolean
    lockedUntil: string | null
    sessionVersion: number
    createdAt: string
    dataCount: number
}

interface SmtpStatus {
    configured: boolean
    provider?: string
    host: string | null
    port: number | null
    from: string | null
    missing: string[]
}

interface Props {
    users: ManagedUserRow[]
    currentUserId: string
    currentUserEmail: string
    smtpStatus: SmtpStatus
}

export default function AdminUsersWorkspace({ users, currentUserId, currentUserEmail, smtpStatus }: Props) {
    const [createState, createAction] = useActionState(createUserAction, EMPTY_ACTION_RESULT)
    const [smtpState, smtpAction]     = useActionState(sendSmtpTestEmailAction, EMPTY_ACTION_RESULT)
    const [feedback, setFeedback]     = useState<ActionResult>(EMPTY_ACTION_RESULT)
    const [loadingId, setLoadingId]   = useState<string | null>(null)
    const [, startTransition]         = useTransition()

    const totals = useMemo(() => ({
        total:      users.length,
        superusers: users.filter(u => u.role === 'SUPERUSER').length,
        locked:     users.filter(u => u.isLocked).length,
        records:    users.reduce((s, u) => s + u.dataCount, 0),
    }), [users])

    function act(id: string, fn: () => Promise<ActionResult>) {
        setLoadingId(id)
        startTransition(async () => {
            const result = await fn()
            setFeedback(result)
            setLoadingId(null)
        })
    }

    function handleDelete(user: ManagedUserRow) {
        if (!window.confirm(`"${user.name || user.email}" kullanıcısı ve tüm finans verileri silinsin mi? Bu işlem geri alınamaz.`)) return
        act(`del-${user.id}`, () => deleteUserAction(user.id))
    }

    return (
        <div className="space-y-8">

            {/* KPI satırı */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Kullanıcı', value: totals.total, color: 'var(--text-primary)' },
                    { label: 'Superuser', value: totals.superusers, color: 'var(--accent-success)' },
                    { label: 'Bağlı kayıt', value: totals.records, color: 'var(--accent-info)' },
                    { label: 'Kilitli hesap', value: totals.locked, color: totals.locked > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' },
                ].map(kpi => (
                    <div key={kpi.label} className="fintech-card p-5">
                        <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                        <p className="text-3xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                ))}
            </div>

            <FormMessage success={feedback.success} message={feedback.message} />

            <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-6">

                {/* Sol: Kullanıcı oluştur + SMTP */}
                <div className="space-y-6">

                    {/* Yeni kullanıcı */}
                    <section className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <UserPlus className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Yeni Kullanıcı</h2>
                        </div>
                        <form action={createAction} className="space-y-4">
                            <div>
                                <label className="form-label">Ad Soyad</label>
                                <input name="name" className="form-input" placeholder="Kullanıcının adı" />
                            </div>
                            <div>
                                <label className="form-label">E-posta *</label>
                                <input name="email" type="email" className="form-input" placeholder="ornek@domain.com" required />
                            </div>
                            <div>
                                <label className="form-label">Geçici şifre *</label>
                                <input name="password" type="password" className="form-input" minLength={8} required />
                            </div>
                            <div>
                                <label className="form-label">Rol</label>
                                <select name="role" defaultValue="USER" className="form-input form-select">
                                    <option value="USER">Kullanıcı</option>
                                    <option value="SUPERUSER">Superuser</option>
                                </select>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                SMTP aktifse giriş bilgileri otomatik e-posta ile gönderilir.
                            </p>
                            <FormMessage success={createState.success} message={createState.message} />
                            <SubmitButton label="Kullanıcı Oluştur" pendingLabel="Oluşturuluyor..." />
                        </form>
                    </section>

                    {/* SMTP */}
                    <section className="fintech-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-5 h-5" style={{ color: smtpStatus.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }} />
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>SMTP Sistemi</h2>
                        </div>

                        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
                            <div className="flex items-center gap-2 mb-1">
                                {smtpStatus.configured
                                    ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                                    : <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                                }
                                <p className="text-sm font-semibold" style={{ color: smtpStatus.configured ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                                    {smtpStatus.configured ? 'Mail gönderimi hazır' : 'SMTP yapılandırılmamış'}
                                </p>
                            </div>
                            <p className="text-xs ml-6" style={{ color: 'var(--text-muted)' }}>
                                {smtpStatus.configured
                                    ? `${smtpStatus.from} · ${smtpStatus.host}:${smtpStatus.port}${smtpStatus.provider === 'resend' ? ' (Resend)' : ''}`
                                    : `Eksik: ${smtpStatus.missing.join(', ')}`
                                }
                            </p>
                        </div>

                        <form action={smtpAction} className="space-y-3">
                            <div>
                                <label className="form-label">Test e-postası</label>
                                <input name="testEmail" type="email" className="form-input"
                                    defaultValue={currentUserEmail} disabled={!smtpStatus.configured} required />
                            </div>
                            <FormMessage success={smtpState.success} message={smtpState.message} />
                            <SubmitButton label="Test Maili Gönder" pendingLabel="Gönderiliyor..."
                                className="btn-secondary w-full inline-flex items-center justify-center gap-2" />
                        </form>
                    </section>
                </div>

                {/* Sağ: kullanıcı listesi */}
                <section className="fintech-card overflow-hidden">
                    <div className="p-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <Users className="w-5 h-5" style={{ color: 'var(--accent-info)' }} />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kullanıcılar</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                                    {['Kullanıcı', 'Rol', 'Güvenlik', 'Son giriş', 'Veri', 'İşlem'].map(h => (
                                        <th key={h} className="text-left font-semibold px-4 py-3 text-xs uppercase tracking-[0.12em]"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => {
                                    const isMe = user.id === currentUserId
                                    const busy = loadingId?.endsWith(user.id)

                                    return (
                                        <tr key={user.id} className={user.isLocked ? 'fintech-card-critical' : ''}
                                            style={{ borderBottom: '1px solid var(--border-default)', opacity: busy ? 0.6 : 1 }}>

                                            {/* Kullanıcı */}
                                            <td className="px-4 py-3">
                                                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {user.name || 'İsimsiz'}
                                                    {isMe && <span className="ml-2 text-xs" style={{ color: 'var(--accent-info)' }}>(sen)</span>}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                                                {user.lastLoginIp && (
                                                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>IP: {user.lastLoginIp}</p>
                                                )}
                                            </td>

                                            {/* Rol */}
                                            <td className="px-4 py-3">
                                                <span className={user.role === 'SUPERUSER' ? 'status-badge status-badge-success' : 'status-badge status-badge-neutral'}>
                                                    {user.role === 'SUPERUSER' && <ShieldCheck className="w-3 h-3" />}
                                                    {user.role === 'SUPERUSER' ? 'Superuser' : 'Kullanıcı'}
                                                </span>
                                            </td>

                                            {/* Güvenlik */}
                                            <td className="px-4 py-3">
                                                {user.isLocked ? (
                                                    <span className="status-badge status-badge-danger flex items-center gap-1 w-fit">
                                                        <Lock className="w-3 h-3" /> Kilitli
                                                    </span>
                                                ) : user.failedLoginAttempts > 0 ? (
                                                    <span className="status-badge status-badge-warning">
                                                        {user.failedLoginAttempts} hatalı deneme
                                                    </span>
                                                ) : (
                                                    <span className="status-badge status-badge-success">
                                                        <ShieldOff className="w-3 h-3" /> Temiz
                                                    </span>
                                                )}
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    v{user.sessionVersion}
                                                </p>
                                            </td>

                                            {/* Son giriş */}
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {user.lastLoginAt
                                                    ? new Date(user.lastLoginAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                    : <span style={{ color: 'var(--text-muted)' }}>Henüz yok</span>}
                                            </td>

                                            {/* Veri */}
                                            <td className="px-4 py-3 tabular-nums text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {user.dataCount} kayıt
                                            </td>

                                            {/* İşlemler */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Kilidi kaldır */}
                                                    {(user.isLocked || user.failedLoginAttempts > 0) && (
                                                        <button type="button" title="Kilidi kaldır"
                                                            disabled={busy}
                                                            onClick={() => act(`unlock-${user.id}`, () => unlockUserAction(user.id))}
                                                            className="btn-icon"
                                                            style={{ color: 'var(--accent-warning)' }}>
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {/* Oturumları sıfırla */}
                                                    {!isMe && (
                                                        <button type="button" title="Tüm oturumları sonlandır"
                                                            disabled={busy}
                                                            onClick={() => act(`ses-${user.id}`, () => resetUserSessionsAction(user.id))}
                                                            className="btn-icon"
                                                            style={{ color: 'var(--accent-info)' }}>
                                                            <LogOut className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {/* Sil */}
                                                    {!isMe && (
                                                        <button type="button" title="Kullanıcıyı sil"
                                                            disabled={busy}
                                                            onClick={() => handleDelete(user)}
                                                            className="btn-icon"
                                                            style={{ color: 'var(--accent-danger)' }}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />}
                                                </div>
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
