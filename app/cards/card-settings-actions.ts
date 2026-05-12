'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { upsertCardFinanceSettings, recordCardPayment } from '@/lib/card-finance-settings-service'
import { toNumberOrZero, toRequiredNumber } from '@/lib/action-result'

const RATE_PERCENT_OPTIONS = { min: 0, max: 100 } as const

function toPercentFraction(value: FormDataEntryValue | null, field: string, label: string) {
    return toNumberOrZero(value, field, label, RATE_PERCENT_OPTIONS) / 100
}

export async function saveCardFinanceSettingsAction(formData: FormData) {
    const user = await requireCurrentUser()
    await upsertCardFinanceSettings(user.id, {
        contractualRate: toNumberOrZero(formData.get('contractualRate'), 'contractualRate', 'Akdi faiz orani', RATE_PERCENT_OPTIONS),
        defaultRate: toNumberOrZero(formData.get('defaultRate'), 'defaultRate', 'Gecikme faiz orani', RATE_PERCENT_OPTIONS),
        cashAdvanceRate: toNumberOrZero(formData.get('cashAdvanceRate'), 'cashAdvanceRate', 'Nakit avans faiz orani', RATE_PERCENT_OPTIONS),
        minPaymentRateBelow50k: toPercentFraction(formData.get('minPaymentRateBelow50k'), 'minPaymentRateBelow50k', 'Asgari odeme orani'),
        minPaymentRateAbove50k: toPercentFraction(formData.get('minPaymentRateAbove50k'), 'minPaymentRateAbove50k', 'Asgari odeme orani'),
        kkdfRate: toPercentFraction(formData.get('kkdfRate'), 'kkdfRate', 'KKDF orani'),
        bsmvRate: toPercentFraction(formData.get('bsmvRate'), 'bsmvRate', 'BSMV orani'),
        notes: String(formData.get('notes') ?? '') || undefined,
    })
    ;['/', '/cards', '/payment-plan'].forEach((p) => revalidatePath(p))
}

export async function recordCardPaymentAction(formData: FormData) {
    const user = await requireCurrentUser()
    await recordCardPayment(
        user.id,
        String(formData.get('cardId')),
        toRequiredNumber(formData.get('amount'), 'amount', 'Tutar', { min: 0.01 }),
        String(formData.get('accountId')),
        String(formData.get('description') ?? '') || undefined
    )
    ;['/', '/cards', '/accounts', '/transactions'].forEach((p) => revalidatePath(p))
}
