import { prisma } from './prisma'
import { calculateRiskScore } from './finance-risk-score'
import { getMarketRates, calculateAssetValue } from './market-data'

export type InsightType = 'INFO' | 'WARNING' | 'SUCCESS' | 'RISK'

export interface GeneratedInsight {
    title: string
    content: string
    type: InsightType
}

export async function generateInsights(userId?: string): Promise<GeneratedInsight[]> {
    const assets = await prisma.asset.findMany({ where: userId ? { userId } : {} })
    const debts = await prisma.debt.findMany({ where: userId ? { userId } : {} })
    const subscriptions = await prisma.subscription.findMany({ where: userId ? { userId } : {} })
    const creditCards = await prisma.creditCard.findMany({
        where: userId ? { userId } : {},
        include: { transactions: true, payments: true }
    })
    const marketRates = await getMarketRates()

    const insights: GeneratedInsight[] = []

    // 1. Risk Skoru Analizi
    const risk = calculateRiskScore(assets, debts, marketRates, creditCards)
    if (risk.score < 40) {
        insights.push({
            title: "Yüksek Finansal Risk",
            content: `Finansal risk skorun ${risk.score}/100 seviyesinde. Borç yükün varlıklarına göre çok yüksek. Acilen bir ödeme planı oluşturmalısın.`,
            type: 'RISK'
        })
    } else if (risk.score > 80) {
        insights.push({
            title: "Mükemmel Finansal Sağlık",
            content: `Tebrikler! ${risk.score} skor ile finansal olarak çok güvenli bir noktadasın. Yatırımlarını çeşitlendirmeyi düşünebilirsin.`,
            type: 'SUCCESS'
        })
    }

    // 2. Abonelik Analizi
    const totalSubs = subscriptions.reduce((acc, s) => acc + s.amount, 0)
    const totalAssets = assets.reduce((acc, a) => acc + calculateAssetValue(a.amount, a.type, a.currency, marketRates), 0)

    if (totalSubs > 0) {
        const subRatio = (totalSubs / (totalAssets || 1)) * 100
        if (subRatio > 5) {
            insights.push({
                title: "Abonelik Yükü Uyarısı",
                content: `Aboneliklerin aylık ${totalSubs.toLocaleString('tr-TR')} TL tutuyor. Bu, toplam varlığının %${subRatio.toFixed(1)}'ine denk geliyor. Gereksiz abonelikleri iptal etmeyi düşün.`,
                type: 'WARNING'
            })
        }
    }

    // 3. Likidite Analizi
    if (risk.liquidityRatio < 1) {
        insights.push({
            title: "Nakit Akışı Sıkışıklığı",
            content: "Kısa vadeli likidite oranını 1'in altında görüyorum. Ödemelerini yapmakta zorlanabilirsin, nakit rezervini artırmalısın.",
            type: 'WARNING'
        })
    }

    // 4. Kart Kullanım Analizi
    creditCards.forEach(card => {
        const charges = card.transactions
            .filter((t: any) => t.type !== 'REFUND')
            .reduce((s: number, t: any) => s + t.amount, 0)
        const payments = card.payments.reduce((s: number, p: any) => s + p.amount, 0)
        const debt = Math.max(charges - payments, 0)
        const utilization = (debt / (card.totalLimit || 1)) * 100

        if (utilization > 80) {
            insights.push({
                title: `${card.cardName} Limit Uyarısı`,
                content: `${card.cardName} kartının limitinin %${utilization.toFixed(0)} kadarını kullanmışsın. Bu durum kredi skorunu olumsuz etkileyebilir.`,
                type: 'WARNING'
            })
        }
    })

    return insights
}

export async function refreshInsights(userId?: string) {
    const newInsights = await generateInsights(userId)

    // Eski okunmamış insightları temizle (isteğe bağlı, şimdilik sadece ekleyelim)
    for (const insight of newInsights) {
        // Aynı başlıkta yakın zamanda eklenmiş bir insight var mı kontrol et
        const existing = await prisma.aIInsight.findFirst({
            where: {
                title: insight.title,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Son 24 saat
            }
        })

        if (!existing) {
            await prisma.aIInsight.create({
                data: {
                    ...insight,
                    userId
                }
            })
        }
    }
}
