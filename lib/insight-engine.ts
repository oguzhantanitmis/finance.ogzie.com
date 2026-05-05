import { prisma } from '@/lib/prisma'
import { getAvailableCash } from '@/lib/account-service'

type InsightType = 'ALERT' | 'INFO' | 'SUCCESS' | 'WARNING'

interface LocalInsight {
    title: string
    content: string
    type: InsightType
    risk?: string
    action?: string
    priority: number
}

/**
 * Ücretsiz (0 API cost), deterministik çalışarak temel altyapı önerileri sunar.
 * OpenAI'e gitmeden kullanıcının durumunu hızlıca değerlendirir.
 */
export async function generateLocalInsights(userId: string): Promise<LocalInsight[]> {
    const recommendations: LocalInsight[] = []

    const [accounts, cards, debts, subscriptions, recurringExpenses, goals] = await Promise.all([
        prisma.account.findMany({ where: { userId, isActive: true } }),
        prisma.creditCard.findMany({ where: { userId, status: 'ACTIVE' }, include: { statements: { orderBy: { periodEnd: 'desc' }, take: 1 } } }),
        prisma.debt.findMany({ where: { userId } }),
        prisma.subscription.findMany({ where: { userId, isActive: true } }),
        prisma.recurringExpense.findMany({ where: { userId, status: 'ACTIVE' } }),
        prisma.financialGoal.findMany({ where: { userId, status: 'GOAL_ACTIVE' } }),
    ])

    const availableCash = await getAvailableCash(userId)

    // 1. Nakit Akışı Riski
    const shortTermDebts = debts
        .filter(d => ['CREDIT_CARD', 'PERSONAL_LOAN'].includes(d.type))
        .reduce((sum, d) => sum + d.remainingBalance, 0)

    if (shortTermDebts > availableCash && availableCash > 0) {
        recommendations.push({
            type: 'ALERT',
            priority: 95,
            title: 'Nakit Akışı Riski',
            content: `Kısa vadeli borç yükünüz (${shortTermDebts.toFixed(0)} TL) nakit varlığınızı (${availableCash.toFixed(0)} TL) aşıyor.`,
            risk: 'Beklenmedik masraflarda likidite problemi yaşanabilir.',
            action: 'Nakit akışınızı rahatlatmak için mevcut nakdinizi acil durumlara saklayın ve kredi kartı asgari tutarlarını düzenli ödeyin.'
        })
    }

    // 2. Limit Riski (High Credit Utilization)
    for (const c of cards) {
        const debt = c.statements[0]?.statementBalance ?? 0
        if (c.totalLimit > 0 && (debt / c.totalLimit) > 0.8) {
            recommendations.push({
                type: 'ALERT',
                priority: 85,
                title: 'Yüksek Kredi Kullanımı',
                content: `${c.cardName} kartınızın limitini %${Math.round((debt / c.totalLimit) * 100)} oranında kullanıyorsunuz.`,
                risk: 'Kredi puanınızı olumsuz etkileyebilir.',
                action: 'Yeni harcamaları nakit veya banka kartı ile yapın.'
            })
        }
    }

    // 3. Abonelik Mükerrerliği
    const subNames = subscriptions.map(s => s.name.toLowerCase().trim())
    const duplicates = subNames.filter((item, index) => subNames.indexOf(item) !== index)
    if (duplicates.length > 0) {
        recommendations.push({
            type: 'INFO',
            priority: 60,
            title: 'Olası Çift Abonelik',
            content: `"${duplicates[0]}" isimli aboneliğinize benzer birden fazla aktif abonelik tespit ettik.`,
            action: 'Abonelikler sayfasından ilgili hizmeti iptal ederek tasarruf edebilirsiniz.'
        })
    }

    // 4. Yaklaşan Ödemeler (7 gün içinde)
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const upcomingSubs = subscriptions.filter(s => {
        const next = new Date(s.nextPayment)
        return next >= now && next <= weekLater
    })
    const upcomingRecurring = recurringExpenses.filter(r => {
        const next = new Date(r.nextPayment)
        return next >= now && next <= weekLater
    })

    if (upcomingSubs.length + upcomingRecurring.length > 0) {
        const totalUpcoming = upcomingSubs.reduce((s, sub) => s + sub.amount, 0) + upcomingRecurring.reduce((s, r) => s + r.amount, 0)
        const names = [...upcomingSubs.map(s => s.name), ...upcomingRecurring.map(r => r.name)].slice(0, 3).join(', ')
        recommendations.push({
            type: 'WARNING',
            priority: 80,
            title: 'Yaklaşan Ödemeler',
            content: `7 gün içinde ${upcomingSubs.length + upcomingRecurring.length} ödeme bekleniyor (toplam ${totalUpcoming.toFixed(0)} TL): ${names}${upcomingSubs.length + upcomingRecurring.length > 3 ? '...' : ''}`,
            action: 'Hesabınızda yeterli bakiye olduğundan emin olun.'
        })
    }

    // 5. Acil Fon Yoksa
    const hasEmergencyGoal = goals.some(g => g.category === 'Acil Fon' || g.title.toLowerCase().includes('acil'))
    if (!hasEmergencyGoal && accounts.length > 0) {
        recommendations.push({
            type: 'INFO',
            priority: 50,
            title: 'Acil Fon Önerisi',
            content: 'Henüz bir "Acil Fon" hedefiniz yok. Finansal güvenlik ağı olarak 3-6 aylık gideriniz kadar acil fon biriktirmeniz önerilir.',
            action: 'Hedefler sayfasından "Acil Fon" hedefi oluşturun.'
        })
    }

    // 6. Hedef Süresi Geçenler
    const overdueGoals = goals.filter(g => new Date(g.targetDate) < now && g.currentAmount < g.targetAmount)
    if (overdueGoals.length > 0) {
        recommendations.push({
            type: 'WARNING',
            priority: 65,
            title: 'Süresi Geçen Hedefler',
            content: `${overdueGoals.length} hedefin süresi geçti: ${overdueGoals.map(g => g.title).slice(0, 2).join(', ')}. Tarihlerini güncelleyin veya birikim hızınızı artırın.`,
            action: 'Hedefler sayfasından tarihleri düzenleyin.'
        })
    }

    // 7. Hesap yoksa
    if (accounts.length === 0) {
        recommendations.push({
            type: 'INFO',
            priority: 100,
            title: 'Hesap Oluşturun',
            content: 'Gelir ve giderlerinizi takip edebilmek için en az bir hesap oluşturmanız gerekiyor.',
            action: 'Hesaplar sayfasından yeni bir hesap ekleyin.'
        })
    }

    // 8. Pozitif — Borç azalması
    const totalDebt = debts.reduce((s, d) => s + d.remainingBalance, 0)
    if (totalDebt === 0 && debts.length > 0) {
        recommendations.push({
            type: 'SUCCESS',
            priority: 40,
            title: 'Tebrikler — Borçsuz Yaşam! 🎉',
            content: 'Tüm borçlarınızı kapattınız. Bu büyük bir başarı!',
            action: 'Tasarruflarınızı yatırıma yönlendirmeyi düşünün.'
        })
    }

    // 9. Yüksek Abonelik Yükü (gelirin %20'sinden fazla)
    const monthlySubTotal = subscriptions.reduce((s, sub) => s + (sub.monthlyNormalizedAmount ?? sub.amount), 0)
    // Gelir bilgisi varsa kontrol et
    const incomes = await prisma.incomeSource.findMany({ where: { userId }, select: { amount: true, billingCycle: true } })
    const monthlyIncome = incomes.reduce((s, i) => s + (i.billingCycle === 'YEARLY' ? i.amount / 12 : i.amount), 0)

    if (monthlyIncome > 0 && monthlySubTotal / monthlyIncome > 0.20) {
        recommendations.push({
            type: 'WARNING',
            priority: 75,
            title: 'Yüksek Abonelik Yükü',
            content: `Aylık abonelik giderleriniz (${monthlySubTotal.toFixed(0)} TL) gelirinizin %${Math.round((monthlySubTotal / monthlyIncome) * 100)}'ini oluşturuyor.`,
            risk: 'Uzun vadede tasarruf gücünüzü azaltır.',
            action: 'Simülasyon sayfasından hangi abonelikleri iptal edebileceğinizi analiz edin.'
        })
    }

    // Önceliğe göre sırala
    return recommendations.sort((a, b) => b.priority - a.priority)
}
