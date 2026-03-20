import PageShell from '@/components/PageShell'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CardDetailView from '@/components/cards/CardDetailView'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

async function getCardDetail(id: string) {
    const user = await getCurrentUser()
    if (!user) return null

    try {
        const card = await prisma.creditCard.findFirst({
            where: { id, userId: user.id },
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
        <PageShell width="genis">
            <CardDetailView card={serializedCard} />
        </PageShell>
    )
}
