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
import { createGoal, deleteGoal, updateGoal, updateGoalProgress } from '@/lib/goal-service'

type GoalField = 'title' | 'description' | 'targetAmount' | 'currentAmount' | 'targetDate' | 'category'
type GoalProgressField = 'currentAmount'

export async function createGoalAction(
    previousState: ActionResult<GoalField> | FormData,
    formData?: FormData,
): Promise<ActionResult<GoalField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const targetDate = new Date(String(data.get('targetDate') ?? new Date().toISOString()))
        const goal = await createGoal(user.id, {
            title: toRequiredString(data.get('title'), 'title', 'Hedef basligi'),
            description: toOptionalString(data.get('description')),
            targetAmount: toRequiredNumber(data.get('targetAmount'), 'targetAmount', 'Hedef tutar', { min: 0.01 }),
            targetDate,
            category: toOptionalString(data.get('category')),
            relatedDebtId: toOptionalString(data.get('relatedDebtId')),
            relatedCardId: toOptionalString(data.get('relatedCardId')),
        })
        ;['/', '/goals'].forEach((p) => revalidatePath(p))
        return createSuccessResult('Hedef kaydedildi.', goal.id)
    } catch (error) {
        return getActionErrorResult<GoalField>(error, 'Hedef kaydedilemedi.')
    }
}

export async function updateGoalAction(
    previousState: ActionResult<GoalField> | FormData,
    formData?: FormData,
): Promise<ActionResult<GoalField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const goalId = String(data.get('goalId'))
        const goal = await updateGoal(user.id, goalId, {
            title: toRequiredString(data.get('title'), 'title', 'Hedef basligi'),
            description: toOptionalString(data.get('description')) ?? null,
            targetAmount: toRequiredNumber(data.get('targetAmount'), 'targetAmount', 'Hedef tutar', { min: 0.01 }),
            currentAmount: toRequiredNumber(data.get('currentAmount'), 'currentAmount', 'Birikmis tutar', { min: 0 }),
            targetDate: new Date(String(data.get('targetDate') ?? new Date().toISOString())),
            category: toOptionalString(data.get('category')) ?? null,
        })
        ;['/', '/goals'].forEach((p) => revalidatePath(p))
        return createSuccessResult('Hedef guncellendi.', goal.id)
    } catch (error) {
        return getActionErrorResult<GoalField>(error, 'Hedef guncellenemedi.')
    }
}

export async function updateGoalProgressAction(
    previousState: ActionResult<GoalProgressField> | FormData,
    formData?: FormData,
): Promise<ActionResult<GoalProgressField>> {
    const data = resolveFormData(previousState, formData)

    try {
        const user = await requireCurrentUser()
        const goalId = String(data.get('goalId'))
        const currentAmount = toRequiredNumber(data.get('currentAmount'), 'currentAmount', 'Birikmis tutar', { min: 0 })
        await updateGoalProgress(user.id, goalId, currentAmount)
        ;['/', '/goals'].forEach((p) => revalidatePath(p))
        return createSuccessResult('Hedef ilerlemesi guncellendi.', goalId)
    } catch (error) {
        return getActionErrorResult<GoalProgressField>(error, 'Hedef ilerlemesi guncellenemedi.')
    }
}

export async function deleteGoalAction(goalId: string): Promise<ActionResult> {
    try {
        const user = await requireCurrentUser()
        await deleteGoal(goalId, user.id)
        ;['/', '/goals'].forEach((p) => revalidatePath(p))
        return createSuccessResult('Hedef silindi.', goalId)
    } catch (error) {
        return getActionErrorResult(error, 'Hedef silinemedi.')
    }
}
