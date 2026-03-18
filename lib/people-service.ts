'use server'

import type { Person } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface PersonWithSummary extends Person {
    totalReceivable: number
    totalPayable: number
    netPosition: number
    activeCount: number
}

export async function getPeople(userId: string): Promise<PersonWithSummary[]> {
    const people = await prisma.person.findMany({
        where: { userId, isActive: true },
        include: {
            receivablesPayables: {
                where: { status: { not: 'CLOSED' } },
                select: { type: true, remainingAmount: true },
            },
        },
        orderBy: { name: 'asc' },
    })

    return people.map((p) => {
        const totalReceivable = p.receivablesPayables
            .filter((rp) => rp.type === 'RECEIVABLE')
            .reduce((sum, rp) => sum + rp.remainingAmount, 0)
        const totalPayable = p.receivablesPayables
            .filter((rp) => rp.type === 'PAYABLE')
            .reduce((sum, rp) => sum + rp.remainingAmount, 0)
        return {
            ...p,
            receivablesPayables: undefined as never,
            totalReceivable,
            totalPayable,
            netPosition: totalReceivable - totalPayable,
            activeCount: p.receivablesPayables.length,
        }
    })
}

export async function createPerson(
    userId: string,
    data: { name: string; phone?: string; email?: string; notes?: string }
): Promise<Person> {
    return prisma.person.create({
        data: { userId, name: data.name, phone: data.phone, email: data.email, notes: data.notes },
    })
}

export async function updatePerson(
    personId: string,
    data: { name?: string; phone?: string | null; email?: string | null; notes?: string | null }
): Promise<Person> {
    return prisma.person.update({ where: { id: personId }, data })
}

export async function deletePerson(personId: string): Promise<void> {
    await prisma.person.update({ where: { id: personId }, data: { isActive: false } })
}

export async function getPersonDetail(personId: string) {
    return prisma.person.findUniqueOrThrow({
        where: { id: personId },
        include: {
            receivablesPayables: {
                orderBy: { createdAt: 'desc' },
                include: {
                    transactions: {
                        orderBy: { transactionDate: 'desc' },
                        include: { account: { select: { name: true } } },
                    },
                },
            },
        },
    })
}

export async function getRPSummary(userId: string) {
    const rps = await prisma.receivablePayable.findMany({
        where: { userId, status: { not: 'CLOSED' } },
        select: { type: true, remainingAmount: true, status: true, dueDate: true },
    })

    const totalReceivable = rps.filter((r) => r.type === 'RECEIVABLE').reduce((s, r) => s + r.remainingAmount, 0)
    const totalPayable = rps.filter((r) => r.type === 'PAYABLE').reduce((s, r) => s + r.remainingAmount, 0)
    const overdueCount = rps.filter((r) => r.status === 'OVERDUE' || (r.dueDate && r.dueDate < new Date())).length

    return { totalReceivable, totalPayable, net: totalReceivable - totalPayable, overdueCount }
}
