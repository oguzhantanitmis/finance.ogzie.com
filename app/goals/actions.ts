'use server'

import { revalidatePath } from 'next/cache'
import { requireCurrentUser } from '@/lib/server-auth'
import { createGoal, updateGoalProgress, deleteGoal } from '@/lib/goal-service'

export async function createGoalAction(formData: FormData) {
    const user = await requireCurrentUser()
    const targetDate = new Date(String(formData.get('targetDate') ?? new Date().toISOString()))
    await createGoal(user.id, {
        title: String(formData.get('title') ?? '').trim(),
        description: String(formData.get('description') ?? '') || undefined,
        targetAmount: Number(formData.get('targetAmount') ?? 0),
        targetDate,
        category: String(formData.get('category') ?? '') || undefined,
        relatedDebtId: String(formData.get('relatedDebtId') ?? '') || undefined,
        relatedCardId: String(formData.get('relatedCardId') ?? '') || undefined,
    })
    ;['/', '/goals'].forEach((p) => revalidatePath(p))
}

export async function updateGoalProgressAction(formData: FormData) {
    await requireCurrentUser()
    const goalId = String(formData.get('goalId'))
    const currentAmount = Number(formData.get('currentAmount') ?? 0)
    await updateGoalProgress(goalId, currentAmount)
    ;['/', '/goals'].forEach((p) => revalidatePath(p))
}

export async function deleteGoalAction(goalId: string) {
    await requireCurrentUser()
    await deleteGoal(goalId)
    ;['/', '/goals'].forEach((p) => revalidatePath(p))
}
