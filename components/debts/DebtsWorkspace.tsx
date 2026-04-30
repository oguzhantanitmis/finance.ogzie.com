'use client'

import Link from 'next/link'
import { useActionState, useEffect, useMemo, useState, useTransition } from 'react'
import { CreditCard, Landmark, Plus, Users } from 'lucide-react'
import type { DebtType } from '@prisma/client'

import { addDebt, deleteDebt, updateDebt } from '@/app/actions'
import { createRPAction, deleteRPAction, updateRPAction } from '@/app/people/actions'
import DebtTable from '@/components/DebtTable'
import FormMessage from '@/components/ui/FormMessage'
import Modal from '@/components/ui/Modal'
import SubmitButton from '@/components/ui/SubmitButton'
import { EMPTY_ACTION_RESULT, type ActionResult } from '@/lib/action-result'
import type { DebtPersonOption, DebtView } from '@/lib/debt-views'

type CreateDebtType = 'LOAN' | 'PERSONAL' | 'MANUAL'

const CREATE_TYPE_OPTIONS: Array<{ value: CreateDebtType; label: string; description: string }> = [
    { value: 'LOAN', label: 'Banka Kredisi', description: 'Çekilen kredi, toplam geri ödeme, vade ve faiz ile takip et.' },
    { value: 'PERSONAL', label: 'Şahsi Borç', description: 'Kişi seçerek borcu alacak/verecek sistemiyle takip et.' },
    { value: 'MANUAL', label: 'Diğer Borç', description: 'Vergi, kefalet veya tekil borçları manuel kaydet.' },
]

function isPersonalDebt(debt: DebtView) {
    return debt.sourceKind === 'PERSONAL_RP'
}

export default function DebtsWorkspace({
    debts,
    people,
}: {
    debts: DebtView[]
    people: DebtPersonOption[]
}) {
    const [showAdd, setShowAdd] = useState(false)
    const [createType, setCreateType] = useState<CreateDebtType>('LOAN')
    const [editingDebt, setEditingDebt] = useState<DebtView | null>(null)
    const [feedback, setFeedback] = useState<ActionResult | null>(null)
    const [, startDeleteTransition] = useTransition()

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

            <DebtTable debts={debts} onEdit={setEditingDebt} onDelete={handleDelete} />

            {showAdd ? (
                <Modal title="Yeni Borç Ekle" onClose={() => setShowAdd(false)}>
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
                <Modal title="Borcu Düzenle" onClose={() => setEditingDebt(null)}>
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
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Bağlı kişi</p>
                <p className="font-semibold text-white">{personName}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                    label={isLoan ? 'Faiz oranı (%)' : isKmh ? 'KMH faiz oranı (%)' : isCard ? 'Kart faiz oranı (%)' : 'Faiz oranı (%)'}
                    name="interestRate"
                    type="number"
                    step="0.01"
                    defaultValue={debt?.interestRate ?? 0}
                />
                {isCard || isKmh ? (
                    <Field label={isCard ? 'Asgari ödeme oranı' : 'Asgari/kapama oranı'} name="minPaymentRate" type="number" step="0.01" defaultValue={debt?.minPaymentRate ?? 0.2} />
                ) : (
                    <Field label={isLoan ? 'Kalan borç' : 'Kalan bakiye'} name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} required />
                )}
            </div>

            {isLoan ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Çekilen kredi" name="totalPrincipal" type="number" step="0.01" defaultValue={debt?.totalPrincipal ?? ''} required />
                        <Field label="Geri ödenecek toplam" name="totalBalance" type="number" step="0.01" defaultValue={debt?.totalBalance ?? ''} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Kalan borç" name="remainingBalance" type="number" step="0.01" defaultValue={debt?.remainingBalance ?? ''} required />
                        <Field label="Kredi vadesi (ay)" name="installments" type="number" min="1" defaultValue={debt?.installments ?? ''} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Kalan vade" name="remainingInstallments" type="number" min="0" defaultValue={debt?.remainingInstallments ?? ''} />
                        <Field label="İlk ödeme tarihi" name="dueDate" type="date" defaultValue={debt?.dueDate ? debt.dueDate.slice(0, 10) : ''} required />
                    </div>
                    <Field label="Aylık ödeme günü (opsiyonel)" name="paymentDueDay" type="number" min="1" max="31" defaultValue={debt?.paymentDueDay ?? ''} />
                </>
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

            {(isLoan || isCard || isKmh) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="KKDF oranı" name="kkdfRate" type="number" step="0.01" defaultValue={debt?.kkdfRate ?? 0.15} />
                    <Field label="BSMV oranı" name="bsmvRate" type="number" step="0.01" defaultValue={debt?.bsmvRate ?? 0.15} />
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
