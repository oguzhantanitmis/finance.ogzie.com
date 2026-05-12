'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { upsertCardFinanceSettings, recordCardPayment } from '@/lib/card-finance-settings-service'
import { toNumberOrZero, toRequiredNumber } from '@/lib/action-result'

const RATE_PERCENT_OPTIONS = { min: 0, max: 100 } as const
const RATE_FRACTION_OPTIONS = { min: 0, max: 1 } as const

export async function saveCardFinanceSettingsAction(formData: FormData) {
    const user = await requireCurrentUser()
    await upsertCardFinanceSettings(user.id, {
        contractualRate: toNumberOrZero(formData.get('contractualRate'), 'contractualRate', 'Akdi faiz orani', RATE_PERCENT_OPTIONS),
        defaultRate: toNumberOrZero(formData.get('defaultRate'), 'defaultRate', 'Gecikme faiz orani', RATE_PERCENT_OPTIONS),
        cashAdvanceRate: toNumberOrZero(formData.get('cashAdvanceRate'), 'cashAdvanceRate', 'Nakit avans faiz orani', RATE_PERCENT_OPTIONS),
        minPaymentRateBelow50k: toNumberOrZero(formData.get('minPaymentRateBelow50k'), 'minPaymentRateBelow50k', 'Asgari odeme orani', RATE_FRACTION_OPTIONS),
        minPaymentRateAbove50k: toNumberOrZero(formData.get('minPaymentRateAbove50k'), 'minPaymentRateAbove50k', 'Asgari odeme orani', RATE_FRACTION_OPTIONS),
        kkdfRate: toNumberOrZero(formData.get('kkdfRate'), 'kkdfRate', 'KKDF orani', RATE_FRACTION_OPTIONS),
        bsmvRate: toNumberOrZero(formData.get('bsmvRate'), 'bsmvRate', 'BSMV orani', RATE_FRACTION_OPTIONS),
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
