import PageShell from '@/components/PageShell'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import CardGrid from '@/components/cards/CardGrid'
import CardsMobile, { type CreditCardItem } from '@/components/cards/CardsMobile'
import AddCardButton from '@/components/cards/AddCardButton'
import { syncCanonicalDebtsForUser } from '@/lib/canonical-debt-service'
import { hashHue, hexToHue } from '@/lib/mobile-format'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

async function getCards() {
    const user = await getCurrentUser()
    if (!user) return null

    try {
        await syncCanonicalDebtsForUser(user.id)
        const cards = await prisma.creditCard.findMany({
            where: { userId: user.id },
            include: {
                // CardGrid yalnızca tutar toplamları için kullanıyor — dar select payload'ı küçültür
                transactions: { select: { type: true, amount: true } },
                payments: { select: { amount: true } },
                statements: {
                    orderBy: { statementDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const canonicalDebts = await prisma.debtAccount.findMany({
            where: {
                userId: user.id,
                sourceType: 'CREDIT_CARD',
                sourceEntityId: { in: cards.map((card) => card.id) },
            },
            select: { sourceEntityId: true, currentBalance: true },
        })
        const debtByCardId = new Map(canonicalDebts.map((debt) => [debt.sourceEntityId, debt.currentBalance]))

        return cards.map((card) => {
            const currentDebt = debtByCardId.get(card.id) ?? card.currentDebt ?? 0
            return {
                ...card,
                currentDebt,
                availableLimit: Math.max(card.totalLimit - currentDebt, 0),
            }
        })
    } catch (error) {
        console.error('Error fetching cards:', error)
        return []
    }
}

function mapToCardItems(cards: NonNullable<Awaited<ReturnType<typeof getCards>>>): CreditCardItem[] {
    return cards.map((c) => ({
        id: c.id,
        bank: c.bankName,
        last4: c.last4Digits,
        limit: c.totalLimit,
        debt: c.currentDebt,
        min: c.statements[0]?.minimumPayment || Math.round(c.currentDebt * c.minPaymentRate),
        statementDay: c.cutOffDay,
        dueDay: c.paymentDueDay,
        hue: hexToHue(c.color, hashHue(c.id)),
    }))
}

export default async function CardsPage() {
    const cards = await getCards()

    if (cards === null) {
        redirect('/login')
    }

    return (
        <PageShell width="genis">
            <div className="lg:hidden">
                <CardsMobile cards={mapToCardItems(cards)} />
            </div>
            <div className="hidden lg:block">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Kredi Kartlarım</h1>
                        <p className="text-zinc-500">Tüm kartlarını tek ekrandan yönet.</p>
                    </div>
                    <Suspense>
                        <AddCardButton />
                    </Suspense>
                </header>

                <CardGrid cards={cards} />
            </div>
        </PageShell>
    )
}
