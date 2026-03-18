'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { upsertCardFinanceSettings, recordCardPayment } from '@/lib/card-finance-settings-service'

export async function saveCardFinanceSettingsAction(formData: FormData) {
    const user = await requireCurrentUser()
    await upsertCardFinanceSettings(user.id, {
        contractualRate: Number(formData.get('contractualRate') ?? 0),
        defaultRate: Number(formData.get('defaultRate') ?? 0),
        cashAdvanceRate: Number(formData.get('cashAdvanceRate') ?? 0),
        minPaymentRateBelow50k: Number(formData.get('minPaymentRateBelow50k') ?? 0),
        minPaymentRateAbove50k: Number(formData.get('minPaymentRateAbove50k') ?? 0),
        kkdfRate: Number(formData.get('kkdfRate') ?? 0),
        bsmvRate: Number(formData.get('bsmvRate') ?? 0),
        notes: String(formData.get('notes') ?? '') || undefined,
    })
    ;['/', '/cards', '/payment-plan'].forEach((p) => revalidatePath(p))
}

export async function recordCardPaymentAction(formData: FormData) {
    const user = await requireCurrentUser()
    await recordCardPayment(
        user.id,
        String(formData.get('cardId')),
        Number(formData.get('amount') ?? 0),
        String(formData.get('accountId')),
        String(formData.get('description') ?? '') || undefined
    )
    ;['/', '/cards', '/accounts', '/transactions'].forEach((p) => revalidatePath(p))
}
