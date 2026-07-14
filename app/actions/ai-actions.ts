'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireSuperuser } from '@/lib/server-auth'
import { runProactiveAiAnalysis } from '@/lib/ai/ai-analyst'

export async function triggerAiAnalysisAction() {
    try {
        const user = await requireSuperuser()
        await runProactiveAiAnalysis(user.id)
        return { success: true }
    } catch (error) {
        console.error('AI Analysis Action Error:', error)
        const message = error instanceof Error ? error.message : 'Analiz sırasında bilinmeyen bir hata oluştu.'
        return { success: false, error: message }
    }
}

// Algorithmic Debt Reduction & Investment Engine (Avalanche Strategy)
export async function generateAvalancheInsights() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        const userId = session.user.id

        // Tazelik koruması: son 1 saat içinde üretilmiş okunmamış insight varsa
        // yeniden hesaplama (her sayfa ziyaretinde sil+yarat churn'ünü önler)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const fresh = await prisma.aIInsight.findFirst({
            where: { userId, isRead: false, createdAt: { gte: oneHourAgo } },
            select: { id: true },
        })
        if (fresh) {
            return { success: true, skipped: true }
        }

        // Clear old algorithmic insights (we use AIInsight model for this)
        await prisma.aIInsight.deleteMany({
            where: { userId, isRead: false }
        })

        const insights = []

        // Fetch Debts & Assets
        const creditCards = await prisma.creditCard.findMany({
            where: { userId },
            include: {
                statements: {
                    where: { status: 'OPEN' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        const canonicalDebts = await prisma.debt.findMany({
            where: { userId, isPaid: false }
        })

        const assets = await prisma.asset.findMany({
            where: { userId, type: { in: ['CASH', 'BANK'] } }
        })

        const totalCash = assets.reduce((acc, asset) => acc + asset.amount, 0)
        let totalMinimumPayments = 0

        const debtNodes = []

        for (const card of creditCards) {
            const stmt = card.statements[0]
            if (stmt && stmt.statementBalance > 0) {
                totalMinimumPayments += stmt.minimumPayment
                debtNodes.push({
                    name: `${card.bankName} Kredi Kartı`,
                    amount: stmt.statementBalance,
                    rate: card.contractualRate,
                    type: 'CREDIT_CARD'
                })
            }
        }

        for (const debt of canonicalDebts) {
            if (debt.remainingBalance && debt.remainingBalance > 0) {
                debtNodes.push({
                    name: debt.name,
                    amount: debt.remainingBalance,
                    rate: debt.interestRate || 3.0,
                    type: 'LOAN'
                })
            }
        }

        // Avalanche Sort
        debtNodes.sort((a, b) => b.rate - a.rate)

        if (debtNodes.length > 0) {
            const highestDebt = debtNodes[0]

            if (totalCash > totalMinimumPayments && highestDebt.rate > 4.0) {
                const surplus = totalCash - totalMinimumPayments
                const payoffAmount = Math.min(surplus, highestDebt.amount)
                
                insights.push({
                    userId,
                    title: 'Avalanche Borç Kapatma Fırsatı',
                    content: `Nakit varlıklarınız asgari ödemelerinizden ${surplus.toLocaleString('tr-TR')} ₺ daha fazla. En yüksek faizli (%${highestDebt.rate}) borcunuz olan "${highestDebt.name}" hesabına ${payoffAmount.toLocaleString('tr-TR')} ₺ ekstra ödeme yaparak ağır faiz yükünden kurtulabilirsiniz.`,
                    type: 'SUCCESS'
                })
            }

            if (totalMinimumPayments > totalCash) {
                insights.push({
                    userId,
                    title: 'Asgari Ödeme Riski',
                    content: `Likit varlıklarınız (${totalCash.toLocaleString('tr-TR')} ₺), bu ayki asgari ödemeleri (${totalMinimumPayments.toLocaleString('tr-TR')} ₺) karşılamıyor. Düşük faizli 60 Ay BDDK yapılandırmasını düşünebilirsiniz.`,
                    type: 'WARNING'
                })
            }
            
            if (debtNodes.length > 1) {
                insights.push({
                    userId,
                    title: 'Kar Topu vs Çığ Etkisi',
                    content: `Sistemimiz Çığ (Avalanche) yöntemini öneriyor. Elinize geçen her ekstra parayı her zaman %${highestDebt.rate} faiziyle "${highestDebt.name}" için kullanmalısınız.`,
                    type: 'INFO'
                })
            }
        } else if (totalCash > 0) {
            insights.push({
                userId,
                title: 'Yatırım Fırsatı',
                content: `Hiç borcunuz yok! Boşta duran ${totalCash.toLocaleString('tr-TR')} ₺ nakit varlığınızı, güncel mevduat oranlarıyla değerlendirirseniz paranız enflasyona karşı korunacaktır.`,
                type: 'TIP'
            })
        }

        if (insights.length > 0) {
            await prisma.aIInsight.createMany({ data: insights })
        }

        revalidatePath('/ai')
        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Borç analizi sırasında bilinmeyen bir hata oluştu.'
        return { success: false, error: message }
    }
}

export async function getAlgorithmicInsights() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' }

        const insights = await prisma.aIInsight.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, insights }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'İçgörüler yüklenirken bilinmeyen bir hata oluştu.'
        return { success: false, error: message }
    }
}
