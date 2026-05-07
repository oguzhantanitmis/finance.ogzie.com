'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { recordSubscriptionPayment, toggleSubscriptionEssential } from '@/lib/subscription-analysis-service'

export async function recordSubscriptionPaymentAction(formData: FormData) {
    const user = await requireCurrentUser()
    await recordSubscriptionPayment(
        user.id,
        String(formData.get('subscriptionId')),
        Number(formData.get('amount') ?? 0),
        String(formData.get('accountId')),
        String(formData.get('description') ?? '') || undefined
    )
    ;['/', '/subscriptions', '/accounts'].forEach((p) => revalidatePath(p))
}

export async function toggleEssentialAction(subscriptionId: string, isEssential: boolean) {
    const user = await requireCurrentUser()
    await toggleSubscriptionEssential(user.id, subscriptionId, isEssential)
    ;['/', '/subscriptions'].forEach((p) => revalidatePath(p))
}
