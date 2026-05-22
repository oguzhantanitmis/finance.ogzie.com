import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { normalizeEmail, PRIMARY_SUPERUSER_EMAIL } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export interface ManagedUserInput {
    email: string
    name?: string
    password: string
    role?: UserRole
}

export async function getManagedUsers() {
    return prisma.user.findMany({
        orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            lastLoginIp: true,
            failedLoginAttempts: true,
            lockedUntil: true,
            sessionVersion: true,
            createdAt: true,
            _count: {
                select: {
                    assets: true,
                    debts: true,
                    transactions: true,
                    subscriptions: true,
                    recurringExpenses: true,
                    incomeSources: true,
                    persons: true,
                    accounts: true,
                    ledgerEntries: true,
                    creditCards: true,
                    financialGoals: true,
                },
            },
        },
    })
}

export async function createManagedUser(input: ManagedUserInput) {
    const email = normalizeEmail(input.email)
    if (!email) {
        throw new Error('E-posta zorunludur.')
    }

    if (input.password.length < 8) {
        throw new Error('Şifre en az 8 karakter olmalıdır.')
    }

    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    })

    if (existing) {
        throw new Error('Bu e-posta ile kayıtlı kullanıcı zaten var.')
    }

    return prisma.user.create({
        data: {
            email,
            name: input.name?.trim() || null,
            password: await bcrypt.hash(input.password, 12),
            role: email === PRIMARY_SUPERUSER_EMAIL ? 'SUPERUSER' : input.role ?? 'USER',
            isActive: true,
        },
    })
}

export async function deleteManagedUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
        throw new Error('Kendi hesabınızı admin panelinden silemezsiniz.')
    }

    const target = await prisma.user.findUniqueOrThrow({
        where: { id: targetUserId },
        select: { id: true, email: true },
    })

    if (normalizeEmail(target.email) === PRIMARY_SUPERUSER_EMAIL) {
        throw new Error('Birincil superuser hesabı silinemez.')
    }

    await prisma.$transaction(async (tx) => {
        const debts = await tx.debt.findMany({
            where: { userId: target.id },
            select: { id: true },
        })
        const debtIds = debts.map((debt) => debt.id)

        if (debtIds.length > 0) {
            await tx.paymentPlan.deleteMany({ where: { debtId: { in: debtIds } } })
        }

        const cards = await tx.creditCard.findMany({
            where: { userId: target.id },
            select: { id: true },
        })
        const cardIds = cards.map((card) => card.id)

        if (cardIds.length > 0) {
            const statements = await tx.cardStatement.findMany({
                where: { creditCardId: { in: cardIds } },
                select: { id: true },
            })
            const transactions = await tx.cardTransaction.findMany({
                where: { creditCardId: { in: cardIds } },
                select: { id: true },
            })
            const statementIds = statements.map((statement) => statement.id)
            const transactionIds = transactions.map((transaction) => transaction.id)
            const installmentWhere = [
                transactionIds.length ? { transactionId: { in: transactionIds } } : null,
                statementIds.length ? { statementId: { in: statementIds } } : null,
            ].filter((where): where is { transactionId: { in: string[] } } | { statementId: { in: string[] } } => Boolean(where))

            if (installmentWhere.length > 0) {
                await tx.cardInstallment.deleteMany({ where: { OR: installmentWhere } })
            }
            await tx.interestAccrual.deleteMany({ where: { creditCardId: { in: cardIds } } })
            await tx.creditCardInterestRecord.deleteMany({ where: { cardId: { in: cardIds } } })
            await tx.cardPayment.deleteMany({ where: { creditCardId: { in: cardIds } } })
            await tx.cardTransaction.deleteMany({ where: { creditCardId: { in: cardIds } } })
            await tx.cardStatement.deleteMany({ where: { creditCardId: { in: cardIds } } })
        }

        const rpRecords = await tx.receivablePayable.findMany({
            where: { userId: target.id },
            select: { id: true },
        })
        const rpIds = rpRecords.map((record) => record.id)

        if (rpIds.length > 0) {
            const installments = await tx.rPInstallment.findMany({
                where: { receivablePayableId: { in: rpIds } },
                select: { id: true },
            })
            const installmentIds = installments.map((installment) => installment.id)
            const reminderWhere = [
                { userId: target.id },
                { financialRecordId: { in: rpIds } },
                installmentIds.length ? { installmentId: { in: installmentIds } } : null,
            ].filter((where): where is { userId: string } | { financialRecordId: { in: string[] } } | { installmentId: { in: string[] } } => Boolean(where))

            await tx.reminder.deleteMany({ where: { OR: reminderWhere } })
            await tx.ledgerEntry.deleteMany({ where: { userId: target.id } })
            await tx.rPRecordEvent.deleteMany({ where: { receivablePayableId: { in: rpIds } } })
            await tx.rPRecordNote.deleteMany({ where: { receivablePayableId: { in: rpIds } } })
            await tx.rPTransaction.deleteMany({ where: { receivablePayableId: { in: rpIds } } })
            await tx.rPInstallment.deleteMany({ where: { receivablePayableId: { in: rpIds } } })
            await tx.receivablePayable.deleteMany({ where: { id: { in: rpIds } } })
        } else {
            await tx.reminder.deleteMany({ where: { userId: target.id } })
            await tx.ledgerEntry.deleteMany({ where: { userId: target.id } })
        }

        await tx.aIRecommendation.deleteMany({ where: { userId: target.id } })
        await tx.aIInsight.deleteMany({ where: { userId: target.id } })
        await tx.budgetAlert.deleteMany({ where: { userId: target.id } })
        await tx.budgetMonth.deleteMany({ where: { userId: target.id } })
        await tx.healthSnapshot.deleteMany({ where: { userId: target.id } })
        await tx.savedPaymentPlan.deleteMany({ where: { userId: target.id } })
        await tx.financialGoal.deleteMany({ where: { userId: target.id } })
        await tx.appSettings.deleteMany({ where: { userId: target.id } })
        await tx.cardFinanceSettings.deleteMany({ where: { userId: target.id } })
        await tx.marketRate.deleteMany({ where: { userId: target.id } })
        await tx.asset.deleteMany({ where: { userId: target.id } })
        await tx.transaction.deleteMany({ where: { userId: target.id } })
        await tx.subscription.deleteMany({ where: { userId: target.id } })
        await tx.recurringExpense.deleteMany({ where: { userId: target.id } })
        await tx.incomeSource.deleteMany({ where: { userId: target.id } })
        await tx.debt.deleteMany({ where: { userId: target.id } })
        await tx.creditCard.deleteMany({ where: { userId: target.id } })
        await tx.person.deleteMany({ where: { userId: target.id } })
        await tx.account.deleteMany({ where: { userId: target.id } })
        await tx.snapshot.deleteMany({ where: { userId: target.id } })
        await tx.user.delete({ where: { id: target.id } })
    })
}
