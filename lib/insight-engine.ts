'use server'

import { prisma } from '@/lib/prisma'
import { getTotalBalance, getAvailableCash } from '@/lib/account-service'

/**
 * Ücretsiz (0 API cost), deterministik çalışarak temel altyapı önerileri sunar.
 * OpenAI'e gitmeden kullanıcının durumunu hızlıca değerlendirir.
 */
export async function generateLocalInsights(userId: string) {
    const recommendations: { title: string, content: string, type: 'ALERT' | 'INFO' | 'SUCCESS', risk?: string, action?: string }[] = []

    const [accounts, cards, debts, subscriptions] = await Promise.all([
        prisma.account.findMany({ where: { userId, isActive: true } }),
        prisma.creditCard.findMany({ where: { userId, status: 'ACTIVE' }, include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1 } } }),
        prisma.debt.findMany({ where: { userId } }),
        prisma.subscription.findMany({ where: { userId, isActive: true } })
    ])

    // Nakit Akışı Riski (Cashflow Warning)
    const availableCash = await getAvailableCash(userId)
    const shortTermDebts = debts.filter(d => ['CREDIT_CARD', 'PERSONAL_LOAN'].includes(d.type)).reduce((sum, d) => sum + d.remainingBalance, 0)
    if (shortTermDebts > availableCash && availableCash > 0) {
        recommendations.push({
            type: 'ALERT',
            title: 'Nakit Akışı Riski',
            content: `Kısa vadeli borç yükünüz (${shortTermDebts} TL) nakit varlığınızı (${availableCash} TL) aşıyor.`,
            risk: 'Beklenmedik masraflarda likidite problemi yaşanabilir.',
            action: 'Nakit akışınızı rahatlatmak için mevcut nakdinizi acil durumlara saklayın ve kredi kartı asgari tutarlarını düzenli ödeyin.'
        })
    }

    // Limit Riski (High Credit Utilization)
    for (const c of cards) {
        const debt = c.statements[0]?.statementBalance ?? 0
        if (c.totalLimit > 0 && (debt / c.totalLimit) > 0.8) {
            recommendations.push({
                type: 'ALERT',
                title: 'Yüksek Kredi Kullanımı',
                content: `${c.cardName} kartınızın limitini %80'in üzerinde kullanıyorsunuz.`,
                risk: 'Kredi puanınızı olumsuz etkileyebilir.',
                action: 'Yeni harcamaları nakit veya banka kartı ile yapın.'
            })
        }
    }

    // Abonelik Mükerrerliği (Duplicate Subscriptions)
    const subNames = subscriptions.map(s => s.name.toLowerCase().trim())
    const duplicates = subNames.filter((item, index) => subNames.indexOf(item) !== index)
    if (duplicates.length > 0) {
        recommendations.push({
            type: 'INFO',
            title: 'Olası Çift Abonelik',
            content: `"${duplicates[0]}" isimli aboneliğinize benzer birden fazla aktif abonelik tespit ettik.`,
            action: 'Abonelikler sayfasından ilgili hizmeti iptal ederek tasarruf edebilirsiniz.'
        })
    }

    return recommendations
}
