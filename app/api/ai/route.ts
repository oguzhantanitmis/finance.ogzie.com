import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'QUERY_BALANCE' | 'QUERY_DEBT' | 'QUERY_CARDS' | 'GREETING' | 'UNKNOWN'

interface ParsedCommand {
    type: CommandType
    amount?: number
    currency?: string
    category?: string
}

function parseCommand(text: string): ParsedCommand {
    const lowerText = text.toLowerCase()

    if (['selam', 'merhaba', 'günaydın', 'iyi geceler', 'hey', 'naber'].some((word) => lowerText.includes(word))) {
        return { type: 'GREETING' }
    }

    const incomeMatch = lowerText.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)
    const expenseMatch = lowerText.match(/(\d+[.,]?\d*)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)

    if (lowerText.includes('kart') || lowerText.includes('ekstre') || lowerText.includes('asgari') || lowerText.includes('faiz')) {
        return { type: 'QUERY_CARDS' }
    }

    if (lowerText.includes('borç') || lowerText.includes('borcum') || lowerText.includes('kredi') || lowerText.includes('ödemem')) {
        return { type: 'QUERY_DEBT' }
    }

    if (lowerText.includes('durum') || lowerText.includes('analiz') || lowerText.includes('risk') || lowerText.includes('rapor') || lowerText.includes('bakiye')) {
        return { type: 'QUERY_BALANCE' }
    }

    if (incomeMatch) {
        return {
            type: 'ADD_INCOME',
            amount: Number(incomeMatch[1].replace(',', '.')),
            currency: mapCurrency(incomeMatch[2]),
            category: incomeMatch[3].trim() || 'Gelir',
        }
    }

    if (expenseMatch) {
        return {
            type: 'ADD_EXPENSE',
            amount: Number(expenseMatch[1].replace(',', '.')),
            currency: mapCurrency(expenseMatch[2]),
            category: expenseMatch[3].trim() || 'Genel',
        }
    }

    return { type: 'UNKNOWN' }
}

function mapCurrency(input?: string) {
    if (!input) return 'TRY'
    if (['usd', 'dolar'].includes(input)) return 'USD'
    if (['eur', 'euro'].includes(input)) return 'EUR'
    return 'TRY'
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { prompt } = (await req.json()) as { prompt: string }
        const command = parseCommand(prompt)
        const summary = await getMonthlyBudgetSummary(user.id)
        const creditCards = await prisma.creditCard.findMany({
            where: { userId: user.id },
            include: {
                transactions: true,
                payments: true,
            },
        })
        const debts = await prisma.debt.findMany({
            where: { userId: user.id },
            include: {
                paymentPlan: {
                    where: { isPaid: false },
                    orderBy: { dueDate: 'asc' },
                    take: 3,
                },
            },
        })

        let responseText = ''

        switch (command.type) {
            case 'GREETING':
                responseText = `Merhaba. Bu ay planlanan gelir ${summary.plannedIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}, sabit yük ${summary.fixedCommitments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}, serbest nakit ${summary.freeCash.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}.`
                break

            case 'ADD_INCOME':
                if (command.amount) {
                    await prisma.transaction.create({
                        data: {
                            userId: user.id,
                            amount: command.amount,
                            type: 'INCOME',
                            category: command.category ?? 'Gelir',
                            description: `AI Chat: ${command.category ?? 'Gelir'}`,
                        },
                    })
                    responseText = `Tamam. ${command.amount.toLocaleString('tr-TR', { style: 'currency', currency: command.currency ?? 'TRY' })} gelir olarak işlendi.`
                }
                break

            case 'ADD_EXPENSE':
                if (command.amount) {
                    await prisma.transaction.create({
                        data: {
                            userId: user.id,
                            amount: command.amount,
                            type: 'EXPENSE',
                            category: command.category ?? 'Gider',
                            description: `AI Chat: ${command.category ?? 'Gider'}`,
                        },
                    })
                    responseText = `Tamam. ${command.amount.toLocaleString('tr-TR', { style: 'currency', currency: command.currency ?? 'TRY' })} gider olarak işlendi.`
                }
                break

            case 'QUERY_BALANCE':
                responseText =
                    `Finansal özet:\n` +
                    `- Planlanan gelir: ${summary.plannedIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Sabit yük: ${summary.fixedCommitments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Borç baskısı: ${summary.debtCommitments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Serbest nakit: ${summary.freeCash.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Net değer: ${summary.netWorth.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`
                break

            case 'QUERY_DEBT': {
                const totalDebt = debts.reduce((sum, debt) => sum + debt.remainingBalance, 0)
                const nearest = debts
                    .flatMap((debt) => debt.paymentPlan.map((plan) => ({ debtName: debt.name, plan })))
                    .sort((left, right) => left.plan.dueDate.getTime() - right.plan.dueDate.getTime())[0]

                responseText =
                    `Borç raporu:\n` +
                    `- Toplam borç: ${totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Bu ay ödeme baskısı: ${summary.debtCommitments.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    (nearest
                        ? `- En yakın taksit: ${nearest.debtName} / ${nearest.plan.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} / ${nearest.plan.dueDate.toLocaleDateString('tr-TR')}`
                        : '- Kayıtlı yakın taksit görünmüyor')
                break
            }

            case 'QUERY_CARDS':
                if (creditCards.length === 0) {
                    responseText = 'Sistemde kayıtlı kredi kartı görünmüyor.'
                    break
                }

                responseText = `Kredi kartı özeti (${creditCards.length} kart):\n\n`
                creditCards.forEach((card) => {
                    const charges = card.transactions
                        .filter((transaction) => transaction.type !== 'REFUND')
                        .reduce((sum, transaction) => sum + transaction.amount, 0)
                    const refunds = card.transactions
                        .filter((transaction) => transaction.type === 'REFUND')
                        .reduce((sum, transaction) => sum + transaction.amount, 0)
                    const payments = card.payments.reduce((sum, payment) => sum + payment.amount, 0)
                    const debt = Math.max(charges - refunds - payments, 0)
                    const utilization = card.totalLimit > 0 ? (debt / card.totalLimit) * 100 : 0

                    responseText += `- ${card.cardName}: ${debt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} borç, limit kullanım ${utilization.toFixed(0)}%\n`
                })
                break

            default:
                responseText =
                    "Şunu deneyebilirsin:\n- 'Durum analizi yap'\n- 'Borcum ne kadar?'\n- 'Kart analizi'\n- '500 TL harcadım'"
        }

        return NextResponse.json({ text: responseText, role: 'assistant' })
    } catch (error) {
        console.error('AI API Error:', error)
        return NextResponse.json({ error: `AI Service Unavailable: ${String(error)}` }, { status: 500 })
    }
}
