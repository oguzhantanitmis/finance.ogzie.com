'use server'

import { RPNoteType, RPPaymentPlanType, RPRiskLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import {
    type ActionResult,
    ActionError,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalNumber,
    toOptionalString,
    toRequiredNumber,
    toRequiredString,
} from '@/lib/action-result'
import { requireCurrentUser } from '@/lib/server-auth'
import { createPerson, updatePerson, deletePerson } from '@/lib/people-service'
import {
    addRPNote,
    createRP,
    deleteRP,
    recordCollection,
    recordPaymentToPerson,
    rescheduleRemainingRP,
    updateRP,
} from '@/lib/receivable-payable-service'

type PersonField = 'name' | 'phone' | 'email' | 'notes'
type RPField =
    | 'description'
    | 'title'
    | 'category'
    | 'amount'
    | 'totalAmount'
    | 'principalAmount'
    | 'originalAmount'
    | 'remainingAmount'
    | 'currency'
    | 'startDate'
    | 'dueDate'
    | 'notes'
    | 'internalNote'
    | 'type'
    | 'paymentPlanType'
    | 'installmentCount'
    | 'firstInstallmentDate'
    | 'installmentPeriod'
    | 'riskLevel'
type RPTransactionField = 'amount' | 'accountId' | 'description' | 'installmentId'
type RPRescheduleField = 'installmentCount' | 'firstInstallmentDate' | 'installmentPeriod' | 'note'
type RPNoteField = 'note' | 'noteType'
type InstallmentPeriod = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'

const INSTALLMENT_OPTIONS = { min: 1, max: 600, integer: true } as const

function revalidatePeoplePaths() {
    ;['/', '/people', '/accounts', '/budget', '/debts', '/payment-plan', '/reports'].forEach((p) => revalidatePath(p))
}

function parseDateOrNull<TField extends string>(
    value: FormDataEntryValue | null,
    field: TField,
    label: string,
) {
    const raw = String(value ?? '').trim()
    if (!raw) return null
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) {
        throw new ActionError(`${label} gecersiz.`, { [field]: `${label} gecersiz.` } as Record<TField, string>)
    }
    return date
}

function parsePaymentPlanType(value: FormDataEntryValue | null) {
    const raw = String(value ?? RPPaymentPlanType.ONE_TIME)
    return Object.values(RPPaymentPlanType).includes(raw as RPPaymentPlanType)
        ? (raw as RPPaymentPlanType)
        : RPPaymentPlanType.ONE_TIME
}

function parseInstallmentPeriod(value: FormDataEntryValue | null): InstallmentPeriod {
    const raw = String(value ?? 'MONTHLY')
    return ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'].includes(raw)
        ? (raw as InstallmentPeriod)
        : 'MONTHLY'
}

function parseRiskLevel(value: FormDataEntryValue | null): RPRiskLevel {
    const raw = String(value ?? RPRiskLevel.MEDIUM)
    return Object.values(RPRiskLevel).includes(raw as RPRiskLevel)
        ? (raw as RPRiskLevel)
        : RPRiskLevel.MEDIUM
}

function parseReminderOptions(data: FormData) {
    return ['DUE_DAY', 'ONE_DAY_BEFORE', 'THREE_DAYS_BEFORE', 'ONE_WEEK_BEFORE']
        .filter((key) => data.get(`reminder_${key}`) === 'on')
}

export async function createPersonAction(
    previousState: ActionResult<PersonField> | FormData,
    formData?: FormData,
): Promise<ActionResult<PersonField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const person = await createPerson(user.id, {
            name: toRequiredString(data.get('name'), 'name', 'Ad soyad'),
            phone: toOptionalString(data.get('phone')),
            email: toOptionalString(data.get('email')),
            notes: toOptionalString(data.get('notes')),
        })
        revalidatePeoplePaths()
        return createSuccessResult('Kisi kaydedildi.', person.id)
    } catch (error) {
        return getActionErrorResult<PersonField>(error, 'Kisi kaydedilemedi.')
    }
}

export async function updatePersonAction(
    previousState: ActionResult<PersonField> | FormData,
    formData?: FormData,
): Promise<ActionResult<PersonField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const personId = String(data.get('personId'))
        const person = await updatePerson(personId, user.id, {
            name: toRequiredString(data.get('name'), 'name', 'Ad soyad'),
            phone: toOptionalString(data.get('phone')) ?? null,
            email: toOptionalString(data.get('email')) ?? null,
            notes: toOptionalString(data.get('notes')) ?? null,
        })
        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Kisi guncellendi.', person.id)
    } catch (error) {
        return getActionErrorResult<PersonField>(error, 'Kisi guncellenemedi.')
    }
}

export async function deletePersonAction(personId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await deletePerson(personId, user.id)
        revalidatePeoplePaths()
        return createSuccessResult('Kisi silindi.', personId)
    } catch (error) {
        return getActionErrorResult(error, 'Kisi silinemedi.')
    }
}

export async function createRPAction(
    previousState: ActionResult<RPField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const paymentPlanType = parsePaymentPlanType(data.get('paymentPlanType'))
        const amount = toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 })
        const totalAmount = toOptionalNumber(data.get('totalAmount'), 'totalAmount', 'Toplam tutar', { min: amount }) ?? amount
        const principalAmount = toOptionalNumber(data.get('principalAmount'), 'principalAmount', 'Ana para', { min: 0.01 }) ?? amount
        const installmentCount = paymentPlanType === 'INSTALLMENT'
            ? toRequiredNumber(data.get('installmentCount'), 'installmentCount', 'Taksit sayisi', INSTALLMENT_OPTIONS)
            : toOptionalNumber(data.get('installmentCount'), 'installmentCount', 'Taksit sayisi', INSTALLMENT_OPTIONS)
        const rp = await createRP(user.id, {
            personId: String(data.get('personId')),
            type: data.get('type') === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE',
            title: toOptionalString(data.get('title')),
            category: toOptionalString(data.get('category')),
            description: toRequiredString(data.get('description'), 'description', 'Aciklama'),
            originalAmount: amount,
            principalAmount,
            totalAmount,
            currency: String(data.get('currency') ?? 'TRY'),
            startDate: parseDateOrNull(data.get('startDate'), 'startDate', 'Baslangic tarihi'),
            dueDate: parseDateOrNull(data.get('dueDate'), 'dueDate', 'Vade tarihi'),
            notes: toOptionalString(data.get('notes')),
            internalNote: toOptionalString(data.get('internalNote')),
            isInstallment: paymentPlanType === 'INSTALLMENT',
            installmentCount,
            paymentPlanType,
            firstInstallmentDate: parseDateOrNull(data.get('firstInstallmentDate'), 'firstInstallmentDate', 'Ilk taksit tarihi'),
            installmentPeriod: parseInstallmentPeriod(data.get('installmentPeriod')),
            reminderEnabled: data.get('reminderEnabled') === 'on',
            reminderOptions: parseReminderOptions(data),
            overdueAlertEnabled: data.get('overdueAlertEnabled') !== 'off',
            riskLevel: parseRiskLevel(data.get('riskLevel')),
        })
        revalidatePeoplePaths()
        revalidatePath(`/people/${String(data.get('personId'))}`)
        return createSuccessResult('Kayit eklendi.', rp.id)
    } catch (error) {
        return getActionErrorResult<RPField>(error, 'Kayit eklenemedi.')
    }
}

export async function updateRPAction(
    previousState: ActionResult<RPField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const rpId = String(data.get('rpId'))
        const personId = String(data.get('personId'))
        const originalAmount = toRequiredNumber(data.get('originalAmount'), 'originalAmount', 'Toplam tutar', { min: 0.01 })
        const remainingAmount = toRequiredNumber(data.get('remainingAmount'), 'remainingAmount', 'Kalan tutar', { min: 0 })

        if (remainingAmount > originalAmount) {
            return {
                success: false,
                message: 'Kalan tutar toplam tutardan buyuk olamaz.',
                fieldErrors: { remainingAmount: 'Kalan tutar toplam tutardan buyuk olamaz.' },
            }
        }

        const rp = await updateRP(user.id, rpId, {
            type: data.get('type') === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE',
            title: toOptionalString(data.get('title')),
            category: toOptionalString(data.get('category')),
            description: toRequiredString(data.get('description'), 'description', 'Aciklama'),
            originalAmount,
            remainingAmount,
            currency: String(data.get('currency') ?? 'TRY'),
            dueDate: parseDateOrNull(data.get('dueDate'), 'dueDate', 'Vade tarihi'),
            notes: toOptionalString(data.get('notes')),
            internalNote: toOptionalString(data.get('internalNote')),
            riskLevel: parseRiskLevel(data.get('riskLevel')),
        })

        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Kayit guncellendi.', rp.id)
    } catch (error) {
        return getActionErrorResult<RPField>(error, 'Kayit guncellenemedi.')
    }
}

export async function deleteRPAction(rpId: string, personId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await deleteRP(user.id, rpId)
        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Kayit silindi.', rpId)
    } catch (error) {
        return getActionErrorResult(error, 'Kayit silinemedi.')
    }
}

export async function recordCollectionAction(
    previousState: ActionResult<RPTransactionField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPTransactionField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const personId = String(data.get('personId'))
        await recordCollection(
            user.id,
            String(data.get('rpId')),
            toRequiredNumber(data.get('amount'), 'amount', 'Tahsilat tutari', { min: 0.01 }),
            toRequiredString(data.get('accountId'), 'accountId', 'Hesap'),
            toOptionalString(data.get('description')),
            {
                installmentId: toOptionalString(data.get('installmentId')),
                isCash: data.get('isCash') === 'on',
                paymentMethod: toOptionalString(data.get('paymentMethod')) ?? undefined,
            },
        )
        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Tahsilat kaydedildi.')
    } catch (error) {
        return getActionErrorResult<RPTransactionField>(error, 'Tahsilat kaydedilemedi.')
    }
}

export async function recordPaymentToPersonAction(
    previousState: ActionResult<RPTransactionField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPTransactionField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const personId = String(data.get('personId'))
        await recordPaymentToPerson(
            user.id,
            String(data.get('rpId')),
            toRequiredNumber(data.get('amount'), 'amount', 'Odeme tutari', { min: 0.01 }),
            toRequiredString(data.get('accountId'), 'accountId', 'Hesap'),
            toOptionalString(data.get('description')),
            {
                installmentId: toOptionalString(data.get('installmentId')),
                isCash: data.get('isCash') === 'on',
                paymentMethod: toOptionalString(data.get('paymentMethod')) ?? undefined,
            },
        )
        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Odeme kaydedildi.')
    } catch (error) {
        return getActionErrorResult<RPTransactionField>(error, 'Odeme kaydedilemedi.')
    }
}

export async function rescheduleRPAction(
    previousState: ActionResult<RPRescheduleField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPRescheduleField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const personId = String(data.get('personId'))
        const firstInstallmentDate = parseDateOrNull(data.get('firstInstallmentDate'), 'firstInstallmentDate', 'Ilk taksit tarihi')
        if (!firstInstallmentDate) {
            return { success: false, message: 'İlk taksit tarihi zorunludur.', fieldErrors: { firstInstallmentDate: 'Tarih zorunlu.' } }
        }

        await rescheduleRemainingRP(user.id, String(data.get('rpId')), {
            installmentCount: toRequiredNumber(data.get('installmentCount'), 'installmentCount', 'Taksit sayısı', INSTALLMENT_OPTIONS),
            firstInstallmentDate,
            installmentPeriod: parseInstallmentPeriod(data.get('installmentPeriod')),
            note: toOptionalString(data.get('note')),
        })

        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Kalan tutar yeniden taksitlendirildi.')
    } catch (error) {
        return getActionErrorResult<RPRescheduleField>(error, 'Yeniden taksitlendirme yapılamadı.')
    }
}

export async function addRPNoteAction(
    previousState: ActionResult<RPNoteField> | FormData,
    formData?: FormData,
): Promise<ActionResult<RPNoteField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const personId = String(data.get('personId'))
        const noteTypeRaw = String(data.get('noteType') ?? RPNoteType.GENERAL)
        const noteType = Object.values(RPNoteType).includes(noteTypeRaw as RPNoteType)
            ? (noteTypeRaw as RPNoteType)
            : RPNoteType.GENERAL
        await addRPNote(
            user.id,
            String(data.get('rpId')),
            toRequiredString(data.get('note'), 'note', 'Not'),
            noteType,
        )

        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Not eklendi.')
    } catch (error) {
        return getActionErrorResult<RPNoteField>(error, 'Not eklenemedi.')
    }
}
