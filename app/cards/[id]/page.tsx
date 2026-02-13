import React from 'react'
import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import CardDetailView from '@/components/cards/CardDetailView'

export const dynamic = 'force-dynamic'

async function getCardDetail(id: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return null

    try {
        const card = await prisma.creditCard.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { transactionDate: 'desc' },
                    take: 50,
                },
                payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 20,
                },
                statements: {
                    orderBy: { statementDate: 'desc' },
                    take: 12,
                },
                interestAccruals: {
                    orderBy: { calculatedAt: 'desc' },
                    take: 12,
                },
            },
        })

        return card
    } catch (error) {
        console.error('Error fetching card detail:', error)
        return null
    }
}

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const card = await getCardDetail(id)

    if (!card) {
        notFound()
    }

    // Güncel borç hesaplama
    const totalCharges = card.transactions
        .filter(t => !['REFUND'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0)
    const totalRefunds = card.transactions
        .filter(t => t.type === 'REFUND')
        .reduce((sum, t) => sum + t.amount, 0)
    const totalPayments = card.payments.reduce((sum, p) => sum + p.amount, 0)
    const currentDebt = Math.max(totalCharges - totalRefunds - totalPayments, 0)

    // Son ekstre
    const latestStatement = card.statements[0] || null
    const statementBalance = latestStatement?.statementBalance || 0
    const minimumPayment = latestStatement?.minimumPayment || 0

    const serializedCard = {
        ...card,
        currentDebt,
        statementBalance,
        minimumPayment,
        availableLimit: card.totalLimit - currentDebt,
        utilizationPercent: (currentDebt / card.totalLimit) * 100,
        transactions: card.transactions.map(t => ({
            ...t,
            transactionDate: t.transactionDate.toISOString(),
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
        })),
        payments: card.payments.map(p => ({
            ...p,
            paymentDate: p.paymentDate.toISOString(),
            createdAt: p.createdAt.toISOString(),
        })),
        statements: card.statements.map(s => ({
            ...s,
            statementDate: s.statementDate.toISOString(),
            dueDate: s.dueDate.toISOString(),
            periodStart: s.periodStart.toISOString(),
            periodEnd: s.periodEnd.toISOString(),
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
        })),
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <main className="md:ml-64 p-6 md:p-10 max-w-[1600px] mx-auto">
                <CardDetailView card={serializedCard} />
            </main>
        </div>
    )
}
