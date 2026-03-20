'use server'

import { revalidatePath } from 'next/cache'
import {
    type ActionResult,
    createSuccessResult,
    getActionErrorResult,
    resolveFormData,
    toOptionalString,
    toRequiredNumber,
    toRequiredString,
} from '@/lib/action-result'
import { requireCurrentUser } from '@/lib/server-auth'
import { createPerson, updatePerson, deletePerson } from '@/lib/people-service'
import { createRP, deleteRP, recordCollection, recordPaymentToPerson, updateRP } from '@/lib/receivable-payable-service'

type PersonField = 'name' | 'phone' | 'email' | 'notes'
type RPField = 'description' | 'amount' | 'originalAmount' | 'remainingAmount' | 'currency' | 'dueDate' | 'notes' | 'type'
type RPTransactionField = 'amount' | 'accountId' | 'description'

function revalidatePeoplePaths() {
    ;['/', '/people', '/accounts', '/budget'].forEach((p) => revalidatePath(p))
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
        const dueDateStr = String(data.get('dueDate') ?? '')
        const rp = await createRP(user.id, {
            personId: String(data.get('personId')),
            type: data.get('type') === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE',
            description: toRequiredString(data.get('description'), 'description', 'Aciklama'),
            originalAmount: toRequiredNumber(data.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
            currency: String(data.get('currency') ?? 'TRY'),
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
            notes: toOptionalString(data.get('notes')),
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
        const dueDateStr = String(data.get('dueDate') ?? '')
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
            description: toRequiredString(data.get('description'), 'description', 'Aciklama'),
            originalAmount,
            remainingAmount,
            currency: String(data.get('currency') ?? 'TRY'),
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
            notes: toOptionalString(data.get('notes')),
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
        )
        revalidatePeoplePaths()
        revalidatePath(`/people/${personId}`)
        return createSuccessResult('Odeme kaydedildi.')
    } catch (error) {
        return getActionErrorResult<RPTransactionField>(error, 'Odeme kaydedilemedi.')
    }
}
