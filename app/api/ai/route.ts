import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { calculateRiskScore } from '@/lib/finance-risk-score'
import { getMarketRates } from '@/lib/market-data'
import { analyzeInterestForPeriod, simulateMinimumPaymentTrap } from '@/lib/card-engine/interest-engine'
import { formatCostBreakdown } from '@/lib/card-engine/tax-engine'

// Types for parsed commands
type CommandType = 'ADD_EXPENSE' | 'ADD_INCOME' | 'QUERY_BALANCE' | 'QUERY_DEBT' | 'QUERY_CARDS' | 'GREETING' | 'UNKNOWN'

interface ParsedCommand {
    type: CommandType
    amount?: number
    currency?: string
    category?: string
    item?: string
}

function parseCommand(text: string): ParsedCommand {
    const lowerText = text.toLowerCase()

    // Greetings
    if (['selam', 'merhaba', 'günaydın', 'iyi geceler', 'hey', 'naber'].some(w => lowerText.includes(w))) {
        return { type: 'GREETING' }
    }

    // Regex Patterns
    const incomeMatch = lowerText.match(/(\d+)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(yattı|geldi|kazandım|aldım)/)
    const expenseMatch = lowerText.match(/(\d+)\s*(tl|usd|eur|dolar|euro)?\s*(.*?)\s*(harcadım|gitti|ödedim|verdim)/)

    // Sorgu - Daha esnek
    // Kredi kartı spesifik sorgular
    if (lowerText.includes('kart') || lowerText.includes('ekstre') || lowerText.includes('asgari') || lowerText.includes('faiz maliyeti')) {
        return { type: 'QUERY_CARDS' }
    }

    if (lowerText.includes('borç') || lowerText.includes('borcum') || lowerText.includes('kredi') || lowerText.includes('ödemem')) {
        return { type: 'QUERY_DEBT' }
    }

    if (lowerText.includes('durum') || lowerText.includes('analiz') || lowerText.includes('risk') || lowerText.includes('rapor')) {
        return { type: 'QUERY_BALANCE' } // Genel durum sorgusu olarak değiştirildi
    }

    if (lowerText.includes('ne kadar') || lowerText.includes('bakiye') || lowerText.includes('param') || lowerText.includes('varlık')) {
        return { type: 'QUERY_BALANCE' }
    }

    if (incomeMatch) {
        return {
            type: 'ADD_INCOME',
            amount: parseFloat(incomeMatch[1]),
            currency: mapCurrency(incomeMatch[2]),
            category: incomeMatch[3].trim() || 'Diğer'
        }
    }

    if (expenseMatch) {
        return {
            type: 'ADD_EXPENSE',
            amount: parseFloat(expenseMatch[1]),
            currency: mapCurrency(expenseMatch[2]),
            category: expenseMatch[3].trim() || 'Genel'
        }
    }

    return { type: 'UNKNOWN' }
}

function mapCurrency(input?: string): string {
    if (!input) return 'TL'
    if (['usd', 'dolar'].includes(input)) return 'USD'
    if (['eur', 'euro'].includes(input)) return 'EUR'
    return 'TL'
}

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()
        const command = parseCommand(prompt)

        let responseText = ""

        // Finansal Verileri Çek
        const assets = await prisma.asset.findMany()
        const debts = await prisma.debt.findMany()
        const creditCards = await prisma.creditCard.findMany({
            include: {
                transactions: true,
                payments: true,
                statements: { orderBy: { statementDate: 'desc' }, take: 1 },
            }
        })
        const marketRates = await getMarketRates()

        // Risk Analizi Yap (Kredi kartları eklendi)
        const risk = calculateRiskScore(assets, debts, marketRates, creditCards)

        switch (command.type) {
            case 'GREETING':
                const warningMsg = risk.warnings.length > 0 ? `\n⚠️ Dikkat: ${risk.warnings[0]}` : ""
                responseText = `Selam Patron! 👋\nŞu an finansal risk skorun: ${risk.score}/100 (${risk.level}).${warningMsg}\n\nSana nasıl yardımcı olabilirim?`
                break

            case 'ADD_INCOME':
                if (command.amount) {
                    await prisma.transaction.create({
                        data: {
                            amount: command.amount,
                            type: 'INCOME',
                            category: command.category || 'Gelir',
                            description: `AI Chat: ${command.category}`,
                            date: new Date()
                        }
                    })
                    responseText = `✅ ${command.amount} ${command.currency} tutarında gelir "${command.category}" olarak eklendi. Likiditen güçleniyor! 💪`
                }
                break

            case 'ADD_EXPENSE':
                if (command.amount) {
                    await prisma.transaction.create({
                        data: {
                            amount: command.amount,
                            type: 'EXPENSE',
                            category: command.category || 'Gider',
                            description: `AI Chat: ${command.category}`,
                            date: new Date()
                        }
                    })
                    // Harcama sonrası risk kontrolü
                    const spendingWarning = risk.score < 50 ? "\n⚠️ Dikkat: Bütçen sıkışık, harcamalarına dikkat etmelisin." : ""
                    responseText = `✅ ${command.amount} ${command.currency} tutarında gider "${command.category}" kategorisine eklendi.${spendingWarning}`
                }
                break

            case 'QUERY_BALANCE':
                const totalAssetsValue = assets.reduce((acc: number, curr: any) => acc + curr.amount, 0)

                responseText = `📊 **Finansal Durum Analizi**\n` +
                    `- Risk Skoru: **${risk.score}/100** (${risk.level})\n` +
                    `- Borç Kaldıracı: %${(risk.leverageRatio * 100).toFixed(1)}\n` +
                    `- Likidite Durumu: ${risk.liquidityRatio > 1 ? '✅ Güçlü' : '⚠️ Zayıf'}\n\n` +
                    (risk.warnings.length > 0 ? `🚨 **Uyarılar:**\n${risk.warnings.map(w => `- ${w}`).join('\n')}` : "Her şey yolunda görünüyor! 🚀")
                break

            case 'QUERY_DEBT':
                const totalDebt = debts.reduce((acc: number, curr: any) => acc + curr.remainingBalance, 0)
                const monthlyLoad = risk.debtServiceLoad
                responseText = `💳 **Borç Raporu**\n` +
                    `- Toplam Borç: ${totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n` +
                    `- Tahmini Aylık Ödeme: ${monthlyLoad.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n\n` +
                    `Borç/Varlık Oranın: %${(risk.leverageRatio * 100).toFixed(1)}. ` +
                    (risk.leverageRatio > 0.5 ? "Bu oran biraz yüksek, borçlarını azaltmaya odaklanmalısın." : "Borç yönetimin gayet başarılı.")
                break

            case 'QUERY_CARDS':
                if (creditCards.length === 0) {
                    responseText = "💳 Henüz sistemde kayıtlı kredi kartın bulunmuyor. Kartlarım sayfasından kart ekleyebilirsin."
                } else {
                    let cardReport = `💳 **Kredi Kartı Raporu** (${creditCards.length} kart)\n\n`
                    let totalCardDebt = 0
                    let totalInterestProjection = 0

                    creditCards.forEach((card: any) => {
                        const charges = card.transactions
                            .filter((t: any) => t.type !== 'REFUND')
                            .reduce((s: number, t: any) => s + t.amount, 0)

                        const refunds = card.transactions
                            .filter((t: any) => t.type === 'REFUND')
                            .reduce((s: number, t: any) => s + t.amount, 0)

                        const payments = card.payments
                            .reduce((s: number, p: any) => s + p.amount, 0)

                        const debt = Math.max(charges - refunds - payments, 0)
                        totalCardDebt += debt

                        const utilization = card.totalLimit > 0 ? (debt / card.totalLimit) * 100 : 0
                        const utilizationEmoji = utilization >= 90 ? '🔴' : utilization >= 70 ? '🟡' : '🟢'

                        cardReport += `**${card.cardName}** (${card.bankName})\n`
                        cardReport += `${utilizationEmoji} Borç: ${debt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} / Limit: ${card.totalLimit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} (%${utilization.toFixed(0)})\n`

                        if (debt > 0) {
                            const interest = analyzeInterestForPeriod({
                                statementBalance: debt,
                                minimumPayment: debt * card.minPaymentRate,
                                paymentMade: 0,
                                contractualRate: card.contractualRate,
                                defaultRate: card.defaultRate,
                                days: 30,
                            })
                            totalInterestProjection += interest.totalInterest.totalCost
                            cardReport += `  Tahmini aylık faiz: ${interest.totalInterest.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n`

                            const trap = simulateMinimumPaymentTrap({
                                currentDebt: debt,
                                minPaymentRate: card.minPaymentRate,
                                contractualRate: card.contractualRate,
                            })
                            if (trap.months > 3) {
                                cardReport += `  ⚠️ Asgari ödeme tuzağı: ${trap.months} ay, toplam ${trap.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n`
                            }
                        }
                        cardReport += `\n`
                    })

                    cardReport += `---\n`
                    cardReport += `📊 Toplam Kart Borcu: ${totalCardDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n`
                    if (totalInterestProjection > 0) {
                        cardReport += `💸 Aylık Faiz Projeksiyonu: ${totalInterestProjection.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n`
                        cardReport += `📅 Yıllık Faiz Tahmin: ${(totalInterestProjection * 12).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}\n`
                    }

                    // En yüksek faizli kartı öner
                    const mostExpensive = creditCards.reduce((max: any, c: any) => c.contractualRate > max.contractualRate ? c : max, creditCards[0])
                    cardReport += `\n💡 **Tavsiye:** Önce "${mostExpensive.cardName}" kartını kapat (%${mostExpensive.contractualRate} faiz — en yüksek oran).`

                    responseText = cardReport
                }
                break

            default:
                responseText = "Bunu tam anlayamadım. Şunları deneyebilirsin:\n- 'Durum analizi yap'\n- 'Borcum ne kadar?'\n- 'Kart analizi'\n- '500 TL harcadım'"
        }

        return NextResponse.json({
            text: responseText,
            role: 'assistant'
        })
    } catch (error) {
        console.error('AI API Error:', error)
        return NextResponse.json({ error: 'AI Service Unavailable: ' + String(error) }, { status: 500 })
    }
}
