import {
    addDays,
    addMonths,
    addWeeks,
    differenceInCalendarDays,
    startOfDay,
} from 'date-fns'
import {
    Prisma,
    RPInstallmentStatus,
    RPNoteType,
    RPPaymentPlanType,
    RPStatus,
    type ReceivablePayable,
} from '@prisma/client'

import { ActionError } from '@/lib/action-result'
import { prisma } from '@/lib/prisma'

type RPDirection = 'RECEIVABLE' | 'PAYABLE'
type InstallmentPeriod = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM'

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function resolveRPStatus(totalAmount: number, remainingAmount: number, dueDate?: Date | null): RPStatus {
    if (remainingAmount <= 0) return 'CLOSED'
    if (dueDate && startOfDay(dueDate) < startOfDay(new Date())) {
        return remainingAmount < totalAmount ? 'PARTIAL' : 'OVERDUE'
    }
    return remainingAmount < totalAmount ? 'PARTIAL' : 'OPEN'
}

function resolveInstallmentStatus(installment: {
    plannedAmount: number
    paidAmount: number
    remainingAmount: number
    dueDate: Date
    status?: string
}): RPInstallmentStatus {
    if (installment.remainingAmount <= 0) return 'PAID'
    if (installment.paidAmount > 0) return 'PARTIAL_PAID'
    if (startOfDay(installment.dueDate) < startOfDay(new Date())) return 'OVERDUE'
    return 'PENDING'
}

function addInstallmentPeriod(date: Date, period: InstallmentPeriod, index: number) {
    if (period === 'DAILY') return addDays(date, index)
    if (period === 'WEEKLY') return addWeeks(date, index)
    if (period === 'BIWEEKLY') return addDays(date, index * 15)
    return addMonths(date, index)
}

function buildInstallments(
    recordId: string,
    totalAmount: number,
    count: number,
    firstDate: Date,
    period: InstallmentPeriod,
    startingNo = 1,
) {
    const safeCount = Math.max(1, count)
    const base = Math.floor((totalAmount / safeCount) * 100) / 100

    return Array.from({ length: safeCount }, (_, index) => {
        const amount = index === safeCount - 1
            ? roundMoney(totalAmount - base * (safeCount - 1))
            : roundMoney(base)
        const dueDate = addInstallmentPeriod(firstDate, period, index)

        return {
            receivablePayableId: recordId,
            installmentNo: startingNo + index,
            dueDate,
            plannedAmount: amount,
            paidAmount: 0,
            remainingAmount: amount,
            status: resolveInstallmentStatus({
                plannedAmount: amount,
                paidAmount: 0,
                remainingAmount: amount,
                dueDate,
            }),
            description: `${startingNo + index}. taksit`,
        }
    })
}

function buildReminderRows(input: {
    userId: string
    recordId: string
    title: string
    installments: Array<{ id?: string; dueDate: Date; installmentNo: number; plannedAmount?: number }>
    reminderOptions?: string[]
}) {
    const options = input.reminderOptions?.length ? input.reminderOptions : ['DUE_DAY']
    const offsetMap: Record<string, number> = {
        DUE_DAY: 0,
        ONE_DAY_BEFORE: -1,
        THREE_DAYS_BEFORE: -3,
        ONE_WEEK_BEFORE: -7,
    }

    return input.installments.flatMap((installment) =>
        options.map((option) => {
            const reminderDate = addDays(installment.dueDate, offsetMap[option] ?? 0)
            return {
                userId: input.userId,
                financialRecordId: input.recordId,
                installmentId: installment.id ?? null,
                title: `${input.title} - ${installment.installmentNo}. taksit`,
                description: `Planlanan tutar: ${installment.plannedAmount ?? 0}`,
                dueDate: reminderDate,
                reminderType: option,
                priority: option === 'DUE_DAY' ? 'HIGH' : 'NORMAL',
                status: 'PENDING',
            }
        }),
    )
}

export async function refreshRPOverdueStatuses(userId: string) {
    const installments = await prisma.rPInstallment.findMany({
        where: {
            receivablePayable: { userId },
            status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] },
            remainingAmount: { gt: 0 },
        },
        select: { id: true, dueDate: true, status: true, receivablePayableId: true },
    })

    const now = startOfDay(new Date())
    const overdue = installments.filter((item) => startOfDay(item.dueDate) < now)

    await Promise.all(overdue.map((item) =>
        prisma.rPInstallment.update({
            where: { id: item.id },
            data: {
                status: 'OVERDUE',
                delayDays: Math.max(0, differenceInCalendarDays(now, startOfDay(item.dueDate))),
            },
        }),
    ))

    const affectedRecordIds = Array.from(new Set(overdue.map((item) => item.receivablePayableId)))
    if (affectedRecordIds.length > 0) {
        await prisma.receivablePayable.updateMany({
            where: { id: { in: affectedRecordIds }, userId, status: { not: 'CLOSED' } },
            data: { status: 'OVERDUE' },
        })
    }
}

export async function createRP(
    userId: string,
    data: {
        personId: string
        type: RPDirection
        title?: string
        category?: string
        description: string
        originalAmount: number
        totalAmount?: number
        principalAmount?: number
        currency?: string
        startDate?: Date | null
        dueDate?: Date | null
        notes?: string
        internalNote?: string
        isInstallment?: boolean
        installmentCount?: number
        paymentPlanType?: RPPaymentPlanType
        firstInstallmentDate?: Date | null
        installmentPeriod?: InstallmentPeriod
        reminderEnabled?: boolean
        reminderOptions?: string[]
        overdueAlertEnabled?: boolean
        riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
        receiptFile?: string
    },
): Promise<ReceivablePayable> {
    await prisma.person.findFirstOrThrow({
        where: { id: data.personId, userId },
        select: { id: true },
    })

    const totalAmount = roundMoney(data.totalAmount ?? data.originalAmount)
    const principalAmount = roundMoney(data.principalAmount ?? data.originalAmount)
    const planType = data.paymentPlanType ?? (data.isInstallment ? 'INSTALLMENT' : 'ONE_TIME')
    const installmentCount = planType === 'INSTALLMENT' ? Math.max(1, data.installmentCount ?? 1) : data.installmentCount ?? null
    const firstInstallmentDate = data.firstInstallmentDate ?? data.dueDate ?? new Date()
    const title = (data.title || data.description).trim()

    return prisma.$transaction(async (tx) => {
        const record = await tx.receivablePayable.create({
            data: {
                userId,
                personId: data.personId,
                type: data.type,
                title,
                category: data.category || null,
                description: data.description,
                principalAmount,
                totalAmount,
                originalAmount: totalAmount,
                paidAmount: 0,
                remainingAmount: totalAmount,
                currency: data.currency ?? 'TRY',
                startDate: data.startDate ?? new Date(),
                dueDate: data.dueDate ?? null,
                notes: data.notes ?? null,
                internalNote: data.internalNote ?? null,
                isInstallment: planType === 'INSTALLMENT',
                installmentCount,
                paymentPlanType: planType,
                firstInstallmentDate: planType === 'INSTALLMENT' ? firstInstallmentDate : null,
                installmentPeriod: data.installmentPeriod ?? 'MONTHLY',
                reminderEnabled: data.reminderEnabled ?? false,
                reminderOptions: data.reminderOptions ?? [],
                overdueAlertEnabled: data.overdueAlertEnabled ?? true,
                riskLevel: data.riskLevel ?? 'MEDIUM',
                receiptFile: data.receiptFile ?? null,
                status: resolveRPStatus(totalAmount, totalAmount, data.dueDate),
            },
        })

        await tx.rPRecordEvent.create({
            data: {
                receivablePayableId: record.id,
                eventType: 'CREATED',
                eventText: `${data.type === 'RECEIVABLE' ? 'Alacak' : 'Verecek'} kaydı oluşturuldu: ${title}.`,
            },
        })

        if (data.internalNote) {
            await tx.rPRecordNote.create({
                data: {
                    receivablePayableId: record.id,
                    personId: data.personId,
                    note: data.internalNote,
                    noteType: 'PERSON_INTERNAL',
                },
            })
        }

        if (planType === 'INSTALLMENT' && installmentCount) {
            const rows = buildInstallments(record.id, totalAmount, installmentCount, firstInstallmentDate, data.installmentPeriod ?? 'MONTHLY')
            await tx.rPInstallment.createMany({ data: rows })
            const createdInstallments = await tx.rPInstallment.findMany({
                where: { receivablePayableId: record.id },
                orderBy: { installmentNo: 'asc' },
            })

            await tx.rPRecordEvent.create({
                data: {
                    receivablePayableId: record.id,
                    eventType: 'PLAN_CREATED',
                    eventText: `${installmentCount} taksitlik ödeme planı oluşturuldu.`,
                },
            })

            if (data.reminderEnabled) {
                await tx.reminder.createMany({
                    data: buildReminderRows({
                        userId,
                        recordId: record.id,
                        title,
                        installments: createdInstallments,
                        reminderOptions: data.reminderOptions,
                    }),
                })
            }
        }

        return record
    })
}

export async function updateRP(
    userId: string,
    rpId: string,
    data: {
        type: RPDirection
        title?: string
        category?: string
        description: string
        originalAmount: number
        remainingAmount: number
        currency?: string
        dueDate?: Date | null
        notes?: string
        internalNote?: string
        riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
    },
): Promise<ReceivablePayable> {
    await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        select: { id: true },
    })

    const paidAmount = roundMoney(Math.max(data.originalAmount - data.remainingAmount, 0))
    const status = resolveRPStatus(data.originalAmount, data.remainingAmount, data.dueDate)

    return prisma.$transaction(async (tx) => {
        const record = await tx.receivablePayable.update({
            where: { id: rpId },
            data: {
                type: data.type,
                title: data.title || data.description,
                category: data.category || null,
                description: data.description,
                originalAmount: data.originalAmount,
                principalAmount: data.originalAmount,
                totalAmount: data.originalAmount,
                paidAmount,
                remainingAmount: data.remainingAmount,
                currency: data.currency ?? 'TRY',
                dueDate: data.dueDate ?? null,
                notes: data.notes ?? null,
                internalNote: data.internalNote ?? null,
                riskLevel: data.riskLevel ?? 'MEDIUM',
                status,
                closedAt: status === 'CLOSED' ? new Date() : null,
            },
        })

        await tx.rPRecordEvent.create({
            data: {
                receivablePayableId: rpId,
                eventType: 'UPDATED',
                eventText: 'Kayıt bilgileri güncellendi.',
            },
        })

        return record
    })
}

export async function deleteRP(userId: string, rpId: string): Promise<void> {
    await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        select: { id: true },
    })
    await prisma.receivablePayable.delete({ where: { id: rpId } })
}

async function getPaymentAccount(userId: string, accountId: string) {
    return prisma.account.findFirstOrThrow({ where: { id: accountId, userId } })
}

async function applyInstallmentPayment(
    tx: Prisma.TransactionClient,
    recordId: string,
    amount: number,
    installmentId?: string | null,
) {
    let remainingPayment = amount
    const updated: Array<{ id: string; applied: number; status: RPInstallmentStatus }> = []
    const installments = await tx.rPInstallment.findMany({
        where: {
            receivablePayableId: recordId,
            id: installmentId ? installmentId : undefined,
            status: { notIn: ['PAID', 'CANCELED', 'RESCHEDULED'] },
            remainingAmount: { gt: 0 },
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNo: 'asc' }],
    })

    const allocatable = installmentId
        ? installments
        : await tx.rPInstallment.findMany({
            where: {
                receivablePayableId: recordId,
                status: { notIn: ['PAID', 'CANCELED', 'RESCHEDULED'] },
                remainingAmount: { gt: 0 },
            },
            orderBy: [{ dueDate: 'asc' }, { installmentNo: 'asc' }],
        })

    for (const installment of allocatable) {
        if (remainingPayment <= 0) break
        const applied = roundMoney(Math.min(installment.remainingAmount, remainingPayment))
        const paidAmount = roundMoney(installment.paidAmount + applied)
        const remainingAmount = roundMoney(installment.remainingAmount - applied)
        const status = resolveInstallmentStatus({
            ...installment,
            paidAmount,
            remainingAmount,
        })

        await tx.rPInstallment.update({
            where: { id: installment.id },
            data: {
                paidAmount,
                remainingAmount,
                status,
                paidDate: status === 'PAID' ? new Date() : installment.paidDate,
                delayDays: remainingAmount > 0
                    ? Math.max(0, differenceInCalendarDays(startOfDay(new Date()), startOfDay(installment.dueDate)))
                    : 0,
            },
        })

        updated.push({ id: installment.id, applied, status })
        remainingPayment = roundMoney(remainingPayment - applied)
    }

    return updated
}

async function recordRPPayment(
    userId: string,
    rpId: string,
    amount: number,
    accountId: string,
    mode: 'collection' | 'payment',
    description?: string,
    options?: {
        installmentId?: string | null
        isCash?: boolean
        paymentMethod?: string
        receiptFile?: string
    },
): Promise<void> {
    if (amount <= 0) throw new ActionError('Tutar sıfırdan büyük olmalıdır.')

    const [record, account] = await Promise.all([
        prisma.receivablePayable.findFirstOrThrow({
            where: { id: rpId, userId },
            include: { installments: true },
        }),
        getPaymentAccount(userId, accountId),
    ])

    if (amount > record.remainingAmount) {
        throw new ActionError('İşlem tutarı kalan tutardan büyük olamaz.')
    }

    if (options?.installmentId) {
        const installment = record.installments.find((item) => item.id === options.installmentId)
        if (!installment) {
            throw new ActionError('Seçilen taksit bu kayda ait değil.')
        }
        if (amount > installment.remainingAmount) {
            throw new ActionError('İşlem tutarı seçilen taksitin kalan tutarından büyük olamaz.')
        }
    }

    const newRemaining = roundMoney(record.remainingAmount - amount)
    const newPaid = roundMoney((record.paidAmount ?? Math.max(record.originalAmount - record.remainingAmount, 0)) + amount)
    const newStatus = resolveRPStatus(record.originalAmount, newRemaining, record.dueDate)
    const eventType = mode === 'collection'
        ? (newRemaining > 0 ? 'PARTIAL_PAYMENT_RECEIVED' : 'PAYMENT_RECEIVED')
        : (newRemaining > 0 ? 'PARTIAL_PAYMENT_MADE' : 'PAYMENT_MADE')
    const ledgerType = mode === 'collection' ? 'COLLECTION' : 'PAYMENT_TO_PERSON'
    const signedAmount = mode === 'collection' ? amount : -amount

    await prisma.$transaction(async (tx) => {
        const affectedInstallments = await applyInstallmentPayment(tx, rpId, amount, options?.installmentId)

        const transaction = await tx.rPTransaction.create({
            data: {
                receivablePayableId: rpId,
                installmentId: affectedInstallments[0]?.id ?? options?.installmentId ?? null,
                amount,
                accountId,
                transactionType: mode,
                currency: record.currency,
                paymentMethod: options?.paymentMethod ?? (options?.isCash ? 'CASH' : 'ACCOUNT'),
                isCash: options?.isCash ?? false,
                description: description || (mode === 'collection' ? 'Tahsilat' : 'Ödeme'),
                receiptFile: options?.receiptFile ?? null,
            },
        })

        await tx.receivablePayable.update({
            where: { id: rpId },
            data: {
                paidAmount: newPaid,
                remainingAmount: newRemaining,
                status: newStatus,
                closedAt: newStatus === 'CLOSED' ? new Date() : null,
            },
        })

        await tx.account.update({
            where: { id: account.id },
            data: { balance: mode === 'collection' ? { increment: amount } : { decrement: amount } },
        })

        await tx.ledgerEntry.create({
            data: {
                userId,
                type: ledgerType,
                amount: signedAmount,
                currency: record.currency,
                description: description || `${mode === 'collection' ? 'Tahsilat' : 'Ödeme'}: ${record.title ?? record.description}`,
                accountId: account.id,
                personId: record.personId,
                rpTransactionId: transaction.id,
                date: new Date(),
                metadata: {
                    financialRecordId: rpId,
                    installmentIds: affectedInstallments.map((item) => item.id),
                    isCash: options?.isCash ?? false,
                },
            },
        })

        await tx.rPRecordEvent.create({
            data: {
                receivablePayableId: rpId,
                eventType,
                eventText: `${mode === 'collection' ? 'Tahsilat alındı' : 'Ödeme yapıldı'}: ${amount.toLocaleString('tr-TR')} ${record.currency}. Kalan: ${newRemaining.toLocaleString('tr-TR')} ${record.currency}.`,
            },
        })
    })
}

export async function recordCollection(
    userId: string,
    rpId: string,
    amount: number,
    accountId: string,
    description?: string,
    options?: { installmentId?: string | null; isCash?: boolean; paymentMethod?: string; receiptFile?: string },
): Promise<void> {
    await recordRPPayment(userId, rpId, amount, accountId, 'collection', description, options)
}

export async function recordPaymentToPerson(
    userId: string,
    rpId: string,
    amount: number,
    accountId: string,
    description?: string,
    options?: { installmentId?: string | null; isCash?: boolean; paymentMethod?: string; receiptFile?: string },
): Promise<void> {
    await recordRPPayment(userId, rpId, amount, accountId, 'payment', description, options)
}

export async function rescheduleRemainingRP(
    userId: string,
    rpId: string,
    data: {
        installmentCount: number
        firstInstallmentDate: Date
        installmentPeriod: InstallmentPeriod
        note?: string
    },
) {
    const record = await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        include: { installments: true },
    })

    if (record.remainingAmount <= 0) {
        throw new ActionError('Kapanmış kayıt yeniden taksitlendirilemez.')
    }

    const maxNo = record.installments.reduce((max, item) => Math.max(max, item.installmentNo), 0)
    const newRows = buildInstallments(
        rpId,
        record.remainingAmount,
        data.installmentCount,
        data.firstInstallmentDate,
        data.installmentPeriod,
        maxNo + 1,
    )

    await prisma.$transaction(async (tx) => {
        await tx.rPInstallment.updateMany({
            where: {
                receivablePayableId: rpId,
                remainingAmount: { gt: 0 },
                status: { notIn: ['PAID', 'CANCELED', 'RESCHEDULED'] },
            },
            data: { status: 'RESCHEDULED' },
        })

        await tx.rPInstallment.createMany({ data: newRows })
        await tx.receivablePayable.update({
            where: { id: rpId },
            data: {
                isInstallment: true,
                installmentCount: data.installmentCount,
                paymentPlanType: 'INSTALLMENT',
                firstInstallmentDate: data.firstInstallmentDate,
                installmentPeriod: data.installmentPeriod,
                dueDate: newRows[newRows.length - 1]?.dueDate ?? record.dueDate,
            },
        })

        await tx.rPRecordEvent.create({
            data: {
                receivablePayableId: rpId,
                eventType: 'RESCHEDULED',
                eventText: `Kalan ${record.remainingAmount.toLocaleString('tr-TR')} ${record.currency}, ${data.installmentCount} taksit olarak yeniden yapılandırıldı.`,
            },
        })

        if (data.note) {
            await tx.rPRecordNote.create({
                data: {
                    receivablePayableId: rpId,
                    personId: record.personId,
                    note: data.note,
                    noteType: 'RESCHEDULE',
                },
            })
        }
    })
}

export async function addRPNote(
    userId: string,
    rpId: string,
    note: string,
    noteType: RPNoteType = 'GENERAL',
) {
    const record = await prisma.receivablePayable.findFirstOrThrow({
        where: { id: rpId, userId },
        select: { id: true, personId: true },
    })

    await prisma.$transaction([
        prisma.rPRecordNote.create({
            data: {
                receivablePayableId: rpId,
                personId: record.personId,
                note,
                noteType,
            },
        }),
        prisma.rPRecordEvent.create({
            data: {
                receivablePayableId: rpId,
                eventType: 'NOTE_ADDED',
                eventText: 'Not eklendi.',
            },
        }),
    ])
}
