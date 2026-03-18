'use server'

import { GoalStatus, type FinancialGoal } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface GoalWithProgress extends FinancialGoal {
    progressPercent: number
}

export async function getGoals(userId: string): Promise<GoalWithProgress[]> {
    const goals = await prisma.financialGoal.findMany({
        where: { userId },
        orderBy: [{ status: 'asc' }, { targetDate: 'asc' }],
    })

    return goals.map((g) => ({
        ...g,
        progressPercent: g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0,
    }))
}

export async function createGoal(
    userId: string,
    data: { title: string; description?: string; targetAmount: number; targetDate: Date; category?: string; relatedDebtId?: string; relatedCardId?: string }
): Promise<FinancialGoal> {
    return prisma.financialGoal.create({
        data: { userId, ...data, status: 'GOAL_ACTIVE' },
    })
}

export async function updateGoalProgress(goalId: string, currentAmount: number) {
    const goal = await prisma.financialGoal.findUniqueOrThrow({ where: { id: goalId } })
    const status = currentAmount >= goal.targetAmount ? 'COMPLETED' : 'GOAL_ACTIVE'
    return prisma.financialGoal.update({
        where: { id: goalId },
        data: { currentAmount, status: status as GoalStatus },
    })
}

export async function deleteGoal(goalId: string) {
    return prisma.financialGoal.delete({ where: { id: goalId } })
}

export async function getActiveGoalForDashboard(userId: string): Promise<GoalWithProgress | null> {
    const goal = await prisma.financialGoal.findFirst({
        where: { userId, status: 'GOAL_ACTIVE' },
        orderBy: { targetDate: 'asc' },
    })
    if (!goal) return null
    return {
        ...goal,
        progressPercent: goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0,
    }
}
