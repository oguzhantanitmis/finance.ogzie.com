'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { createPerson, updatePerson, deletePerson } from '@/lib/people-service'
import { createRP, recordCollection, recordPaymentToPerson } from '@/lib/receivable-payable-service'

function revalidatePeoplePaths() {
    ;['/', '/people', '/accounts', '/budget'].forEach((p) => revalidatePath(p))
}

export async function createPersonAction(formData: FormData) {
    const user = await requireCurrentUser()
    await createPerson(user.id, {
        name: String(formData.get('name') ?? '').trim(),
        phone: String(formData.get('phone') ?? '') || undefined,
        email: String(formData.get('email') ?? '') || undefined,
        notes: String(formData.get('notes') ?? '') || undefined,
    })
    revalidatePeoplePaths()
}

export async function updatePersonAction(formData: FormData) {
    await requireCurrentUser()
    const personId = String(formData.get('personId'))
    await updatePerson(personId, {
        name: String(formData.get('name') ?? '').trim(),
        phone: String(formData.get('phone') ?? '') || null,
        email: String(formData.get('email') ?? '') || null,
        notes: String(formData.get('notes') ?? '') || null,
    })
    revalidatePeoplePaths()
}

export async function deletePersonAction(personId: string) {
    await requireCurrentUser()
    await deletePerson(personId)
    revalidatePeoplePaths()
}

export async function createRPAction(formData: FormData) {
    const user = await requireCurrentUser()
    const dueDateStr = String(formData.get('dueDate') ?? '')
    await createRP(user.id, {
        personId: String(formData.get('personId')),
        type: formData.get('type') === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE',
        description: String(formData.get('description') ?? '').trim(),
        originalAmount: Number(formData.get('amount') ?? 0),
        currency: String(formData.get('currency') ?? 'TRY'),
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        notes: String(formData.get('notes') ?? '') || undefined,
    })
    revalidatePeoplePaths()
}

export async function recordCollectionAction(formData: FormData) {
    const user = await requireCurrentUser()
    await recordCollection(
        user.id,
        String(formData.get('rpId')),
        Number(formData.get('amount') ?? 0),
        String(formData.get('accountId')),
        String(formData.get('description') ?? '') || undefined
    )
    revalidatePeoplePaths()
}

export async function recordPaymentToPersonAction(formData: FormData) {
    const user = await requireCurrentUser()
    await recordPaymentToPerson(
        user.id,
        String(formData.get('rpId')),
        Number(formData.get('amount') ?? 0),
        String(formData.get('accountId')),
        String(formData.get('description') ?? '') || undefined
    )
    revalidatePeoplePaths()
}
