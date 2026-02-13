import React from 'react'
import Navbar from '@/components/Navbar'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CardGrid from '@/components/cards/CardGrid'
import AddCardButton from '@/components/cards/AddCardButton'

export const dynamic = 'force-dynamic'

async function getCards() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return null

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (!user) return null

        const cards = await prisma.creditCard.findMany({
            where: { userId: user.id },
            include: {
                transactions: true,
                payments: true,
                statements: {
                    orderBy: { statementDate: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        return cards
    } catch (error) {
        console.error('Error fetching cards:', error)
        return []
    }
}

export default async function CardsPage() {
    const cards = await getCards()

    if (cards === null) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <main className="md:ml-64 p-6 md:p-10 max-w-[1600px] mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">💳 Kredi Kartlarım</h1>
                        <p className="text-zinc-500">Tüm kartlarını tek ekrandan yönet.</p>
                    </div>
                    <AddCardButton />
                </header>

                <CardGrid cards={cards} />
            </main>
        </div>
    )
}
