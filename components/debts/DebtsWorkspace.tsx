'use client'

import Link from 'next/link'
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, CreditCard, Landmark, Plus, Users } from 'lucide-react'
import type { DebtType } from '@prisma/client'

import { addDebt, deleteDebt, payDebtObligation, setDebtInstallmentPaid, updateDebt } from '@/app/actions'
import { createRPAction, deleteRPAction, updateRPAction } from '@/app/people/actions'
import DebtTable from '@/components/DebtTable'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import { calculateLoanSchedule } from '@/lib/banking-engine'
import type { DebtPaymentObligation, DebtPersonOption, DebtView } from '@/lib/debt-views'
import { formatCurrency } from '@/lib/utils'

type CreateDebtType = 'LOAN' | 'PERSONAL' | 'MANUAL'

const CREATE_TYPE_OPTIONS: Array<{ value: CreateDebtType; label: string; description: string }> = [
    { value: 'LOAN', label: 'Banka Kredisi', description: 'Çekilen kredi, toplam geri ödeme, vade ve faiz ile takip et.' },
    { value: 'PERSONAL', label: 'Şahsi Borç', description: 'Kişi seçerek borcu alacak/verecek sistemiyle takip et.' },
    { value: 'MANUAL', label: 'Diğer Borç', description: 'Vergi, kefalet veya tekil borçları manuel kaydet.' },
]

function isPersonalDebt(debt: DebtView) {
    return debt.sourceKind === 'PERSONAL_RP'
}

function toPercentInput(value: number | null | undefined, fallbackFraction: number) {
    const normalized = value ?? fallbackFraction
    return +((normalized > 1 ? normalized : normalized * 100).toFixed(2))
}

function parseNumberInput(value: string | number | null | undefined) {
    const parsed = Number(String(value ?? '').replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : 0
}

function normalizePercentFraction(value: string | number | null | undefined, fallbackFraction: number) {
    const raw = String(value ?? '').trim()
    if (!raw) return fallbackFraction
    const parsed = parseNumberInput(raw)
    if (parsed < 0) return fallbackFraction
    return parsed > 1 ? parsed / 100 : parsed
}

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function addMonthsToDateInput(dateInput: string, monthOffset: number) {
    if (!dateInput) return ''

    const [year, month, day] = dateInput.split('-').map((part) => Number(part))
    if (!year || !month || !day) return ''

    const date = new Date(year, month - 1 + monthOffset, day)
    const normalizedYear = date.getFullYear()
    const normalizedMonth = String(date.getMonth() + 1).padStart(2, '0')
    const normalizedDay = String(date.getDate()).padStart(2, '0')
    return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`
}

function formatDateInput(value?: string | null) {
    return value ? value.slice(0, 10) : ''
}

function getPaidInstallmentCount(debt?: DebtView) {
    if (!debt) return 0

    const paidFromPlan = debt.paymentPlan?.filter((item) => item.isPaid).length ?? 0
    if (paidFromPlan > 0) return paidFromPlan

    if (debt.installments && typeof debt.remainingInstallments === 'number') {
        return Math.max(0, debt.installments - debt.remainingInstallments)
    }

    return 0
}

function splitTaxAmount(taxAmount: number, kkdfRate: number, bsmvRate: number) {
    const totalTaxRate = kkdfRate + bsmvRate
    if (totalTaxRate <= 0) {
        return { kkdf: 0, bsmv: 0 }
    }

    const kkdf = roundMoney(taxAmount * (kkdfRate / totalTaxRate))
    return {
        kkdf,
        bsmv: roundMoney(taxAmount - kkdf),
    }
}

export default function DebtsWorkspace({
    debts,
    people,
    paymentObligations,
}: {
    debts: DebtView[]
    people: DebtPersonOption[]
    paymentObligations: DebtPaymentObligation[]
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [createType, setCreateType] = useState<CreateDebtType>('LOAN')
    const [editingDebt, setEditingDebt] = useState<DebtView | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [pendingInstallmentId, setPendingInstallmentId] = useState<string | null>(null)
    const [pendingObligationId, setPendingObligationId] = useState<string | null>(null)
    const [, startDeleteTransition] = useTransition()
    const [, startInstallmentTransition] = useTransition()
    const [, startObligationTransition] = useTransition()

    const syncedCount = useMemo(
        () => debts.filter((debt) => debt.sourceKind === 'CREDIT_CARD' || debt.sourceKind === 'KMH_ACCOUNT').length,
        [debts],
    )

    function handleDelete(rowId: string) {
        const debt = debts.find((item) => item.id === rowId)
        if (!debt || !debt.canDelete) return

        if (!confirm('Bu borcu silmek istediğinize emin misiniz?')) return

        startDeleteTransition(async () => {
            const result =
                debt.sourceKind === 'PERSONAL_RP' && debt.personId
                    ? await deleteRPAction(debt.entityId, debt.personId)
                    : await deleteDebt(debt.entityId)

            setFeedback(result)
        })
    }

    function handleToggleInstallment(paymentPlanId: string, paid: boolean) {
        setPendingInstallmentId(paymentPlanId)
        startInstallmentTransition(async () => {
            const result = await setDebtInstallmentPaid(paymentPlanId, paid)
            setPendingInstallmentId(null)
            setFeedback(result)
        })
    }

    function handlePayObligation(obligation: DebtPaymentObligation) {
        setPendingObligationId(obligation.id)
        startObligationTransition(async () => {
            const result = await payDebtObligation({
                type: obligation.type,
                sourceId: obligation.sourceId,
            })
            setPendingObligationId(null)
            setFeedback(result)
        })
    }

    return (
        <div>
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Borç Yönetimi</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Kredi, şahsi borç, kart borcu ve KMH kullanımını tek ekranda ama doğru kaynaktan takip et.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setCreateType('LOAN')
                        setShowAdd(true)
                    }}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" /> Borç Ekle
                </button>
            </div>

            <FormMessage success={feedback?.success} message={feedback?.message} />

            <DueDebtPanel
                obligations={paymentObligations}
                pendingId={pendingObligationId}
                onPay={handlePayObligation}
            />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8 stagger-children">
                <div className="kpi-card kpi-card-info">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-info-bg)' }}>
                            <CreditCard className="w-4 h-4" style={{ color: 'var(--accent-info)' }} />
                        </div>
                        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kart borçları otomatik</h2>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Kartlarım bölümüne eklediğin kredi kartları burada ayrıca borç olarak görünür. Elle kart borcu girmen gerekmez.
                    </p>
                    <Link href="/cards" className="inline-flex items-center gap-2 text-sm font-medium mt-4 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                        Kartlarımı aç →
                    </Link>
                </div>

                <div className="kpi-card kpi-card-warning">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-warning-bg)' }}>
                            <Landmark className="w-4 h-4" style={{ color: 'var(--accent-warning)' }} />
                        </div>
                        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>KMH hesaplardan gelir</h2>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        KMH limiti, faiz oranı, hesap kesimi ve son ödeme günü hesap kaydında tutulur. Eksi bakiye oluşunca borca yansır.
                    </p>
                    <Link href="/accounts" className="inline-flex items-center gap-2 text-sm font-medium mt-4 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                        Hesapları aç →
                    </Link>
                </div>

                <div className="kpi-card kpi-card-success">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-success-bg)' }}>
                            <Users className="w-4 h-4" style={{ color: 'var(--accent-success)' }} />
                        </div>
                        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Şahsi borç kişiyle bağlanır</h2>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Şahsi borç eklerken kişi seçersin. Sonra tahsilat ve ödeme hareketleri kişi kartında ve borç ekranında birlikte görünür.
                    </p>
                    <Link href="/people" className="inline-flex items-center gap-2 text-sm font-medium mt-4 cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                        Kişilere git →
                    </Link>
                </div>
            </div>

            {syncedCount > 0 ? (
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    {syncedCount} kayıt hesaplar ve kartlardan otomatik yansıyor.
                </p>
            ) : null}

            <DebtTable
                debts={debts}
                onEdit={setEditingDebt}
                onDelete={handleDelete}
                onToggleInstallment={handleToggleInstallment}
                pendingInstallmentId={pendingInstallmentId}
            />

            {showAdd ? (
                <Modal
                    title="Yeni Borç Ekle"
                    onClose={() => setShowAdd(false)}
                    maxWidthClassName={createType === 'LOAN' ? 'max-w-5xl' : 'max-w-xl'}
                >
                    <DebtCreateForm
                        people={people}
                        type={createType}
                        onTypeChange={setCreateType}
                        onSuccess={(result) => {
                            setShowAdd(false)
                            setFeedback(result)
                        }}
                    />
                </Modal>
            ) : null}

            {editingDebt ? (
                <Modal
                    title="Borcu Düzenle"
                    onClose={() => setEditingDebt(null)}
                    maxWidthClassName={editingDebt.type === 'LOAN' ? 'max-w-5xl' : 'max-w-xl'}
                >
                    {isPersonalDebt(editingDebt) ? (
                        <PersonalDebtEditForm
                            debt={editingDebt}
                            people={people}
                            onSuccess={(result) => {
                                setEditingDebt(null)
                                setFeedback(result)
                            }}
                        />
                    ) : (
                        <StoredDebtForm
                            mode="edit"
                            debt={editingDebt}
                            onSuccess={(result) => {
                                setEditingDebt(null)
                                setFeedback(result)
                            }}
                        />
                    )}
                </Modal>
            ) : null}
        </div>
    )
}

function DueDebtPanel({
    obligations,
    pendingId,
    onPay,
}: {
    obligations: DebtPaymentObligation[]
    pendingId: string | null
    onPay: (obligation: DebtPaymentObligation) => void
}) {
    const totalDue = roundMoney(obligations.reduce((total, item) => total + item.amount, 0))
    const overdueTotal = roundMoney(obligations.reduce((total, item) => total + item.overdueCost, 0))

    return (
        <section className="fintech-card p-5 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Ödemen gereken borçlar</p>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tek tıkla ödeme işaretle</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 min-w-full lg:min-w-[340px]">
                    <LoanMetric label="Toplam ödenecek" value={totalDue} />
                    <LoanMetric label="Gecikme maliyeti" value={overdueTotal} />
                </div>
            </div>

            {obligations.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Şu anda işaretlenecek kredi taksidi, KMH asgari ödemesi veya kart asgari ödemesi yok.
                </div>
            ) : (
                <div className="space-y-3">
                    {obligations.map((obligation) => {
                        const isPending = pendingId === obligation.id
                        const isOverdue = obligation.overdueDays > 0

                        return (
                            <div
                                key={obligation.id}
                                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="status-badge status-badge-neutral">{obligation.sourceLabel}</span>
                                        {isOverdue ? (
                                            <span className="status-badge status-badge-danger">
                                                <AlertTriangle className="w-3 h-3" /> {obligation.overdueDays} gün gecikti
                                            </span>
                                        ) : (
                                            <span className="status-badge status-badge-success">Zamanında</span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{obligation.name}</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {obligation.note} · Vade {new Date(obligation.dueDate).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xl:min-w-[620px]">
                                    <MiniAmount label="Ana ödeme" value={obligation.baseAmount} />
                                    <MiniAmount label="Gecikme artışı" value={obligation.overdueCost} tone={obligation.overdueCost > 0 ? 'danger' : 'muted'} />
                                    <MiniAmount label="Ödenecek" value={obligation.amount} tone="primary" />
                                    <MiniAmount label="Ödeme sonrası" value={obligation.balanceAfterPayment} />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onPay(obligation)}
                                    disabled={Boolean(pendingId)}
                                    title="Ödendi olarak işaretle"
                                    aria-label="Ödendi olarak işaretle"
                                    className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle2 className={isPending ? 'w-4 h-4 animate-pulse' : 'w-4 h-4'} />
                                    Ödedim
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}

function MiniAmount({
    label,
    value,
    tone = 'normal',
}: {
    label: string
    value: number
    tone?: 'normal' | 'primary' | 'danger' | 'muted'
}) {
    const color =
        tone === 'primary'
            ? 'var(--text-primary)'
            : tone === 'danger'
                ? 'var(--accent-danger)'
                : tone === 'muted'
                    ? 'var(--text-muted)'
                    : 'var(--text-secondary)'

    return (
        <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-mono text-sm font-semibold privacy-blur tabular-nums" style={{ color }}>{formatCurrency(value, 'TRY')}</p>
        </div>
    )
}

function DebtCreateForm({
    people,
    type,
    onTypeChange,
    onSuccess,
}: {
    people: DebtPersonOption[]
    type: CreateDebtType
    onTypeChange: (type: CreateDebtType) => void
    onSuccess: (result: ActionResult) => void
}) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CREATE_TYPE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onTypeChange(option.value)}
                        className="filter-tab cursor-pointer"
                        style={{
                            border: type === option.value ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                            background: type === option.value ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            color: type === option.value ? '#000' : 'var(--text-primary)',
                            borderRadius: '1rem',
                            padding: '1rem',
                            textAlign: 'left' as const,
                        }}
                    >
                        <p className="font-semibold mb-2">{option.label}</p>
                        <p className="text-sm" style={{ color: type === option.value ? 'rgba(0,0,0,0.7)' : 'var(--text-secondary)' }}>{option.description}</p>
                    </button>
                ))}
            </div>

            {type === 'PERSONAL' ? (
                <PersonalDebtCreateForm people={people} onSuccess={onSuccess} />
            ) : (
                <StoredDebtForm mode="create" defaultType={type} onSuccess={onSuccess} />
            )}
        </div>
    )
}

function PersonalDebtCreateForm({
    people,
    onSuccess,
}: {
    people: DebtPersonOption[]
    onSuccess: (result: ActionResult) => void
}) {
    const [state, action] = useActionState(createRPAction, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!state.success) return

        const timeoutId = window.setTimeout(() => onSuccess(state), 0)
        return () => window.clearTimeout(timeoutId)
    }, [onSuccess, state])

    if (people.length === 0) {
        return (
            <div className="fintech-card p-5">
                <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Önce kişi eklemen gerekiyor</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Şahsi borçlar kişi bazlı tutulur. Önce kişi oluştur, sonra buradan seç.
                </p>
                <Link href="/people" className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: 'var(--accent-primary)' }}>
                    Kişiler sayfasına git →
                </Link>
            </div>
        )
    }

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="type" value="PAYABLE" />

            <div>
                <label className="form-label">Kişi</label>
                <select name="personId" className="form-input" required defaultValue={people[0]?.id}>
                    {people.map((person) => (
                        <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Borç açıklaması</label>
                    <input name="description" placeholder="Örn: Ahmet'e verilen nakit, elden borç" className="form-input" required />
                </div>
                <div>
                    <label className="form-label">Borç tutarı</label>
                    <input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" className="form-input" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Para birimi</label>
                    <select name="currency" defaultValue="TRY" className="form-input">
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Ödeme tarihi</label>
                    <input name="dueDate" type="date" className="form-input" />
                </div>
            </div>

            <div>
                <label className="form-label">Not</label>
                <textarea name="notes" placeholder="İsteğe bağlı not" className="form-input min-h-24" />
            </div>

            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label="Şahsi Borcu Kaydet" pendingLabel="Kaydediliyor..." />
        </form>
    )
}

function PersonalDebtEditForm({
    debt,
    people,
    onSuccess,
}: {
    debt: DebtView
    people: DebtPersonOption[]
    onSuccess: (result: ActionResult) => void
}) {
    const [state, action] = useActionState(updateRPAction, EMPTY_ACTION_RESULT)

    useEffect(() => {
        if (!state.success) return

        const timeoutId = window.setTimeout(() => onSuccess(state), 0)
        return () => window.clearTimeout(timeoutId)
    }, [onSuccess, state])

    const personName = people.find((person) => person.id === debt.personId)?.name ?? debt.name

    return (
        <form action={action} className="space-y-4">
            <input type="hidden" name="rpId" value={debt.entityId} />
            <input type="hidden" name="personId" value={debt.personId} />
            <input type="hidden" name="type" value="PAYABLE" />

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-hover)] p-4">
                <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)' }}>Bağlı kişi</p>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{personName}</p>
            </div>

            <div>
                <label className="form-label">Borç açıklaması</label>
                <input name="description" defaultValue={debt.subtitle ?? debt.name} className="form-input" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Toplam borç</label>
                    <input name="originalAmount" type="number" step="0.01" min="0.01" defaultValue={debt.totalBalance} className="form-input" required />
                </div>
                <div>
                    <label className="form-label">Kalan borç</label>
                    <input name="remainingAmount" type="number" step="0.01" min="0" defaultValue={debt.remainingBalance} className="form-input" required />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Para birimi</label>
                    <select name="currency" defaultValue="TRY" className="form-input">
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Ödeme tarihi</label>
                    <input name="dueDate" type="date" defaultValue={debt.dueDate ? debt.dueDate.slice(0, 10) : ''} className="form-input" />
                </div>
            </div>

            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label="Şahsi Borcu Güncelle" pendingLabel="Güncelleniyor..." />
        </form>
    )
}

function StoredDebtForm({
    mode,
    debt,
    defaultType,
    onSuccess,
}: {
    mode: 'create' | 'edit'
    debt?: DebtView
    defaultType?: DebtType | CreateDebtType
    onSuccess: (result: ActionResult) => void
}) {
    const [editType, setEditType] = useState<DebtType>((debt?.type ?? defaultType ?? 'LOAN') as DebtType)
    const [state, action] = useActionState(mode === 'create' ? addDebt : updateDebt, EMPTY_ACTION_RESULT)
    const activeType = mode === 'edit' ? editType : (defaultType as DebtType)

    useEffect(() => {
        if (!state.success) return

        const timeoutId = window.setTimeout(() => onSuccess(state), 0)
        return () => window.clearTimeout(timeoutId)
    }, [onSuccess, state])

    const isLoan = activeType === 'LOAN'
    const isKmh = activeType === 'KMH'
    const isCard = activeType === 'CREDIT_CARD'

    return (
        <form action={action} className="space-y-4">
            {mode === 'edit' && debt ? <input type="hidden" name="debtId" value={debt.entityId} /> : null}

            {mode === 'edit' ? (
                <div>
                    <label className="form-label">Borç türü</label>
                    <select
                        name="type"
                        defaultValue={activeType}
                        onChange={(event) => setEditType(event.target.value as DebtType)}
                        className="form-input"
                    >
                        <option value="LOAN">Banka Kredisi</option>
                        <option value="MANUAL">Diğer Borç</option>
                        <option value="CREDIT_CARD">Eski Kart Borcu</option>
                        <option value="KMH">Eski KMH Kaydı</option>
                        <option value="PERSONAL">Eski Şahsi Borç Kaydı</option>
                    </select>
                </div>
            ) : (
                <input type="hidden" name="type" value={activeType} />
            )}

            <div>
                <label className="form-label">
                    {isLoan ? 'Kredi adı' : isKmh ? 'KMH kayıt adı' : isCard ? 'Kart borcu kayıt adı' : 'Borç adı'}
                </label>
                <input
                    name="name"
                    defaultValue={debt?.name ?? ''}
                    placeholder={
                        isLoan
                            ? 'Örn: İhtiyaç Kredisi'
                            : isKmh
                                ? 'Örn: Eski KMH Kaydı'
                                : isCard
                                    ? 'Örn: Eski Kart Borcu'
                                    : 'Örn: Vergi Borcu'
                    }
                    className="form-input"
                    required
                />
            </div>

            {!isLoan ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                        label={isKmh ? 'KMH faiz oranı (%)' : isCard ? 'Kart faiz oranı (%)' : 'Faiz oranı (%)'}
                        name="interestRate"
                        type="number"
                        step="0.01"
                        defaultValue={debt?.interestRate ?? 0}
                    />
                    {isCard || isKmh ? (
                        <Field label={isCard ? 'Asgari ödeme oranı (%)' : 'Asgari/kapama oranı (%)'} name="minPaymentRate" type="number" min="0" max="100" step="0.01" defaultValue={toPercentInput(debt?.minPaymentRate, 0.2)} />
                    ) : (
                        <Field label="Kalan bakiye" name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} required />
                    )}
                </div>
            ) : null}

            {isLoan ? (
                <LoanFields debt={debt} />
            ) : isCard || isKmh ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label={isKmh ? 'KMH limiti' : 'Kart limiti'} name="limit" type="number" step="0.01" defaultValue={debt?.limit ?? ''} required />
                        <Field label={isKmh ? 'Kullanılan KMH' : 'Dönem borcu'} name="totalBalance" type="number" step="0.01" defaultValue={debt?.totalBalance ?? ''} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Güncel borç" name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} required />
                        <Field label="Hesap kesim günü" name="cutOffDay" type="number" min="1" max="31" defaultValue={debt?.cutOffDay ?? ''} />
                    </div>
                    <Field label="Son ödeme günü" name="paymentDueDay" type="number" min="1" max="31" defaultValue={debt?.paymentDueDay ?? ''} />
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Toplam borç" name="totalBalance" type="number" step="0.01" defaultValue={debt?.totalBalance ?? ''} required />
                        <Field label="Kalan borç" name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} required />
                    </div>
                    <Field label="Ödeme tarihi" name="dueDate" type="date" defaultValue={debt?.dueDate ? debt.dueDate.slice(0, 10) : ''} />
                </>
            )}

            {(isCard || isKmh) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="KKDF oranı (%)" name="kkdfRate" type="number" min="0" max="100" step="0.01" defaultValue={toPercentInput(debt?.kkdfRate, 0.15)} />
                    <Field label="BSMV oranı (%)" name="bsmvRate" type="number" min="0" max="100" step="0.01" defaultValue={toPercentInput(debt?.bsmvRate, 0.15)} />
                </div>
            ) : null}

            {mode === 'create' ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Kart borçları ve KMH kullanımı bu formdan eklenmez; ilgili kart veya hesap kaydından otomatik yansır.
                </p>
            ) : null}

            <FormMessage success={state.success} message={state.message} />
            <SubmitButton label={mode === 'create' ? 'Borcu Kaydet' : 'Borcu Güncelle'} pendingLabel={mode === 'create' ? 'Kaydediliyor...' : 'Güncelleniyor...'} />
        </form>
    )
}

function LoanFields({ debt }: { debt?: DebtView }) {
    const initialPaidInstallments = getPaidInstallmentCount(debt)
    const [totalPrincipal, setTotalPrincipal] = useState(debt?.totalPrincipal ? String(debt.totalPrincipal) : '')
    const [interestRate, setInterestRate] = useState(String(debt?.interestRate ?? 4.49))
    const [installments, setInstallments] = useState(String(debt?.installments ?? 12))
    const [paidInstallments, setPaidInstallments] = useState(String(initialPaidInstallments))
    const [firstDueDate, setFirstDueDate] = useState(formatDateInput(debt?.dueDate))
    const [kkdfRate, setKkdfRate] = useState(String(toPercentInput(debt?.kkdfRate, 0.15)))
    const [bsmvRate, setBsmvRate] = useState(String(toPercentInput(debt?.bsmvRate, 0.15)))

    const principalValue = Math.max(0, parseNumberInput(totalPrincipal))
    const interestValue = Math.max(0, parseNumberInput(interestRate))
    const installmentCount = Math.max(0, Math.trunc(parseNumberInput(installments)))
    const paidCount = Math.min(Math.max(0, Math.trunc(parseNumberInput(paidInstallments))), installmentCount)
    const remainingInstallments = Math.max(0, installmentCount - paidCount)
    const kkdfFraction = normalizePercentFraction(kkdfRate, 0.15)
    const bsmvFraction = normalizePercentFraction(bsmvRate, 0.15)

    const schedule = useMemo(() => {
        if (principalValue <= 0 || installmentCount <= 0) return null
        return calculateLoanSchedule(principalValue, interestValue, installmentCount, {
            kkdfRate: kkdfFraction,
            bsmvRate: bsmvFraction,
        })
    }, [bsmvFraction, installmentCount, interestValue, kkdfFraction, principalValue])

    const rows = useMemo(() => {
        if (!schedule) return []

        return schedule.plan.map((item, index) => {
            const amount = roundMoney(item.principal + item.interest + item.tax)
            const taxes = splitTaxAmount(item.tax, kkdfFraction, bsmvFraction)

            return {
                ...item,
                amount,
                dueDate: addMonthsToDateInput(firstDueDate, index),
                kkdf: taxes.kkdf,
                bsmv: taxes.bsmv,
                isPaid: item.installment <= paidCount,
            }
        })
    }, [bsmvFraction, firstDueDate, kkdfFraction, paidCount, schedule])

    const totalPayment = roundMoney(rows.reduce((total, item) => total + item.amount, 0))
    const remainingPayment = roundMoney(rows.filter((item) => !item.isPaid).reduce((total, item) => total + item.amount, 0))
    const totalInterest = roundMoney(rows.reduce((total, item) => total + item.interest, 0))
    const totalTax = roundMoney(rows.reduce((total, item) => total + item.kkdf + item.bsmv, 0))
    const remainingPrincipal = paidCount > 0
        ? rows[paidCount - 1]?.remainingPrincipal ?? 0
        : principalValue
    const monthlyPayment = rows[0]?.amount ?? 0
    const paymentDueDay = firstDueDate ? Number(firstDueDate.slice(-2)) : ''

    return (
        <div className="space-y-5">
            <input type="hidden" name="totalBalance" value={totalPayment || ''} />
            <input type="hidden" name="remainingBalance" value={remainingPayment || ''} />
            <input type="hidden" name="remainingInstallments" value={remainingInstallments} />
            <input type="hidden" name="paymentDueDay" value={paymentDueDay} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="form-label">Çekilen kredi</label>
                    <input
                        name="totalPrincipal"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={totalPrincipal}
                        onChange={(event) => setTotalPrincipal(event.target.value)}
                        className="form-input"
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Aylık faiz (%)</label>
                    <input
                        name="interestRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={interestRate}
                        onChange={(event) => setInterestRate(event.target.value)}
                        className="form-input"
                    />
                </div>
                <div>
                    <label className="form-label">Vade (ay)</label>
                    <input
                        name="installments"
                        type="number"
                        min="1"
                        max="600"
                        value={installments}
                        onChange={(event) => setInstallments(event.target.value)}
                        className="form-input"
                        required
                    />
                </div>
                <div>
                    <label className="form-label">İlk taksit tarihi</label>
                    <input
                        name="dueDate"
                        type="date"
                        value={firstDueDate}
                        onChange={(event) => setFirstDueDate(event.target.value)}
                        className="form-input"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="form-label">Ödenen taksit sayısı</label>
                    <input
                        type="number"
                        min="0"
                        max={installmentCount || 600}
                        value={paidInstallments}
                        onChange={(event) => setPaidInstallments(event.target.value)}
                        className="form-input"
                    />
                </div>
                <div>
                    <label className="form-label">KKDF (%)</label>
                    <input
                        name="kkdfRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={kkdfRate}
                        onChange={(event) => setKkdfRate(event.target.value)}
                        className="form-input"
                    />
                </div>
                <div>
                    <label className="form-label">BSMV (%)</label>
                    <input
                        name="bsmvRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={bsmvRate}
                        onChange={(event) => setBsmvRate(event.target.value)}
                        className="form-input"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <LoanMetric label="Aylık taksit" value={monthlyPayment} />
                <LoanMetric label="Toplam ödeme" value={totalPayment} />
                <LoanMetric label="Kalan ödeme" value={remainingPayment} />
                <LoanMetric label="Kalan anapara" value={remainingPrincipal} />
                <LoanMetric label="Faiz + vergi" value={totalInterest + totalTax} />
            </div>

            {rows.length > 0 ? (
                <div className="data-table-wrapper max-h-80 overflow-y-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Taksit</th>
                                <th>Vade</th>
                                <th>Tutar</th>
                                <th>Faiz</th>
                                <th>KKDF</th>
                                <th>BSMV</th>
                                <th>Kalan Anapara</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((item) => (
                                <tr key={item.installment} className={item.isPaid ? 'opacity-50' : ''}>
                                    <td className="font-medium">{item.installment}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount, 'TRY')}</td>
                                    <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.interest, 'TRY')}</td>
                                    <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.kkdf, 'TRY')}</td>
                                    <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(item.bsmv, 'TRY')}</td>
                                    <td className="font-mono tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.remainingPrincipal, 'TRY')}</td>
                                    <td>
                                        <span className={item.isPaid ? 'status-badge status-badge-success' : 'status-badge status-badge-neutral'}>
                                            {item.isPaid ? 'Ödendi' : 'Bekliyor'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </div>
    )
}

function LoanMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-mono text-sm font-semibold tabular-nums privacy-blur" style={{ color: 'var(--text-primary)' }}>{formatCurrency(value, 'TRY')}</p>
        </div>
    )
}

function Field({
    label,
    name,
    type,
    defaultValue,
    required,
    step,
    min,
    max,
}: {
    label: string
    name: string
    type: 'text' | 'number' | 'date'
    defaultValue?: string | number | null
    required?: boolean
    step?: string
    min?: string | number
    max?: string | number
}) {
    return (
        <div>
            <label className="form-label">{label}</label>
            <input
                name={name}
                type={type}
                step={step}
                min={min}
                max={max}
                defaultValue={defaultValue ?? ''}
                required={required}
                className="form-input"
            />
        </div>
    )
}
