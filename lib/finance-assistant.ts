import { endOfMonth } from 'date-fns'

import { generatePaymentPlan } from '@/lib/debt-priority-engine'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'
import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/utils'

type Intent =
    | 'faiz_sorgusu'
    | 'borc_bitis_tahmini'
    | 'aylik_odeme'
    | 'alacak_sorgusu'
    | 'verecek_sorgusu'
    | 'nakit_akisi'
    | 'riskli_borclar'
    | 'hedef_durumu'
    | 'rapor_ozeti'

function normalize(text: string) {
    return text.toLocaleLowerCase('tr-TR')
}

function detectIntent(prompt: string): Intent | null {
    const text = normalize(prompt)
    if (text.includes('faiz') && (text.includes('kart') || text.includes('kredi kart'))) return 'faiz_sorgusu'
    if (text.includes('ne zaman bit') || text.includes('borçlarım ne zaman') || text.includes('kapanma süresi')) return 'borc_bitis_tahmini'
    if (text.includes('bu ay') && (text.includes('ödeme') || text.includes('ödemem'))) return 'aylik_odeme'
    if (text.includes('kim bana') || text.includes('bana ne kadar borçlu')) return 'alacak_sorgusu'
    if (text.includes('ben kime') || text.includes('kime ne kadar borçluyum')) return 'verecek_sorgusu'
    if (text.includes('nakit akış') || text.includes('nakit durum')) return 'nakit_akisi'
    if (text.includes('riskli') || text.includes('en risk')) return 'riskli_borclar'
    if (text.includes('hedef')) return 'hedef_durumu'
    if (text.includes('özet') || text.includes('rapor')) return 'rapor_ozeti'
    return null
}

async function answerInterest(userId: string) {
    const [accruals, manual] = await Promise.all([
        prisma.interestAccrual.findMany({
            where: { creditCard: { userId } },
            include: { creditCard: { select: { cardName: true } } },
        }),
        prisma.creditCardInterestRecord.findMany({
            where: { card: { userId } },
            include: { card: { select: { cardName: true } } },
        }),
    ])
    const total = accruals.reduce((sum, item) => sum + item.totalCost, 0) + manual.reduce((sum, item) => sum + item.amount, 0)
    const byCard = new Map<string, number>()
    accruals.forEach((item) => byCard.set(item.creditCard.cardName, (byCard.get(item.creditCard.cardName) ?? 0) + item.totalCost))
    manual.forEach((item) => byCard.set(item.card.cardName, (byCard.get(item.card.cardName) ?? 0) + item.amount))
    const rows = Array.from(byCard.entries()).sort((a, b) => b[1] - a[1])

    if (total <= 0) return 'Bu hesaplama için kayıtlı kredi kartı faiz verisi yok. Faiz kayıtları oluştuğunda kart bazlı dağılımı ve trendi gösterebilirim.'

    return [
        `Bugüne kadar kredi kartlarına toplam ${formatCurrency(total, 'TRY')} faiz/maliyet kaydı düşmüş.`,
        rows.length ? `Kart bazlı dağılım:\n${rows.map(([name, amount]) => `• ${name}: ${formatCurrency(amount, 'TRY')}`).join('\n')}` : '',
        rows[0] ? `En çok faiz maliyeti üreten kart: ${rows[0][0]}. Öncelik: bu kartta asgari üstü ödeme ve yeni harcama durdurma.` : '',
    ].filter(Boolean).join('\n\n')
}

async function answerDebtFinish(userId: string) {
    const plan = await generatePaymentPlan(userId, 'RISK')
    const debtTotal = plan.items.reduce((sum, item) => sum + item.balance, 0)
    if (debtTotal <= 0) return 'Açık borç görünmüyor. Borç kapanış tahmini için ödenmemiş kart, KMH, kredi veya verecek kaydı gerekir.'
    return [
        `Açık borç toplamı: ${formatCurrency(debtTotal, 'TRY')}.`,
        `Son 3 aylık gelir ortalaması ve düzenli giderler sonrası aylık borç ödeme kapasitesi: ${formatCurrency(plan.monthlyDebtBudget, 'TRY')}.`,
        `Risk öncelikli plana göre tahmini bitiş: ${plan.estimatedFinishDate ? new Date(plan.estimatedFinishDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : 'hesaplanamadı'}.`,
        `Tahmini faiz maliyeti: ${formatCurrency(plan.totalInterestEstimate, 'TRY')}. Çığ yöntemini ayrıca denersen beklenen faiz tasarrufu artabilir.`,
    ].join('\n')
}

async function answerMonthlyPayments(userId: string) {
    const now = new Date()
    const end = endOfMonth(now)
    const [installments, cards] = await Promise.all([
        prisma.rPInstallment.findMany({
            where: {
                receivablePayable: { userId, type: 'PAYABLE' },
                status: { in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] },
                dueDate: { lte: end },
            },
            include: { receivablePayable: { include: { person: { select: { name: true } } } } },
            orderBy: { dueDate: 'asc' },
        }),
        prisma.creditCard.findMany({
            where: { userId, status: 'ACTIVE' },
            include: { statements: { orderBy: { statementDate: 'desc' }, take: 1 } },
        }),
    ])
    const installmentTotal = installments.reduce((sum, item) => sum + item.remainingAmount, 0)
    const cardMinimum = cards.reduce((sum, card) => sum + (card.statements[0]?.minimumPayment ?? Math.max((card.currentDebt ?? 0) * card.minPaymentRate, 0)), 0)
    const overdue = installments.filter((item) => item.status === 'OVERDUE' || item.dueDate < now)
    return [
        `Bu ay yapılması gereken ödeme toplamı: ${formatCurrency(installmentTotal + cardMinimum, 'TRY')}.`,
        `Kişi/kurum taksitleri: ${formatCurrency(installmentTotal, 'TRY')}.`,
        `Kredi kartı asgari/tahmini ödeme: ${formatCurrency(cardMinimum, 'TRY')}.`,
        overdue.length ? `Geciken taksit sayısı: ${overdue.length}. Önce gecikenleri kapat.` : 'Geciken taksit görünmüyor.',
    ].join('\n')
}

async function answerReceivables(userId: string) {
    const records = await prisma.receivablePayable.findMany({
        where: { userId, type: 'RECEIVABLE', status: { not: 'CLOSED' } },
        include: { person: { select: { name: true } } },
        orderBy: { remainingAmount: 'desc' },
    })
    if (records.length === 0) return 'Açık alacak görünmüyor.'
    const total = records.reduce((sum, item) => sum + item.remainingAmount, 0)
    return [`Açık alacak toplamı: ${formatCurrency(total, 'TRY')}.`, ...records.slice(0, 10).map((item) => `• ${item.person.name}: ${formatCurrency(item.remainingAmount, item.currency)} - ${item.title ?? item.description}`)].join('\n')
}

async function answerPayables(userId: string) {
    const records = await prisma.receivablePayable.findMany({
        where: { userId, type: 'PAYABLE', status: { not: 'CLOSED' } },
        include: { person: { select: { name: true } } },
        orderBy: { remainingAmount: 'desc' },
    })
    if (records.length === 0) return 'Kişi/kurum bazlı açık verecek görünmüyor.'
    const total = records.reduce((sum, item) => sum + item.remainingAmount, 0)
    return [`Açık verecek toplamı: ${formatCurrency(total, 'TRY')}.`, ...records.slice(0, 10).map((item) => `• ${item.person.name}: ${formatCurrency(item.remainingAmount, item.currency)} - ${item.title ?? item.description}`)].join('\n')
}

async function answerCashflow(userId: string) {
    const summary = await getMonthlyBudgetSummary(userId)
    return [
        `Bu ay beklenen gelir: ${formatCurrency(summary.plannedIncome, 'TRY')}.`,
        `Sabit gider/abonelik yükü: ${formatCurrency(summary.fixedCommitments, 'TRY')}.`,
        `Borç ödeme baskısı: ${formatCurrency(summary.debtCommitments, 'TRY')}.`,
        `Net serbest nakit: ${formatCurrency(summary.freeCash, 'TRY')}.`,
        summary.freeCash < 0 ? 'Risk: Ay sonunda nakit açığı oluşuyor. Geciken ve yüksek faizli borçları öncele, kritik olmayan giderleri ertele.' : 'Durum: Nakit akışı pozitif. Borç kapatma bütçesini planlı şekilde artırabilirsin.',
    ].join('\n')
}

async function answerRiskyDebts(userId: string) {
    const plan = await generatePaymentPlan(userId, 'RISK')
    if (plan.items.length === 0) return 'Risk analizi için açık borç görünmüyor.'
    return [
        'En riskli borçlar:',
        ...plan.items.slice(0, 5).map((item) => `• ${item.priority}. ${item.name}: ${formatCurrency(item.balance, 'TRY')} | faiz %${item.interestRate} | önerilen ödeme ${formatCurrency(item.suggestedPayment, 'TRY')}`),
        plan.warnings.length ? `Uyarılar:\n${plan.warnings.map((warning) => `• ${warning}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
}

async function answerGoals(userId: string) {
    const goals = await prisma.financialGoal.findMany({
        where: { userId, status: 'GOAL_ACTIVE' },
        orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }],
    })
    if (goals.length === 0) return 'Aktif hedef yok. Hedef eklediğinde borç ödeme planı hedef tarihine göre analiz edilir.'
    return goals.slice(0, 5).map((goal) => {
        const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0)
        const days = Math.max(1, Math.ceil((goal.targetDate.getTime() - Date.now()) / 86400000))
        const monthly = goal.monthlyRequiredAmount ?? remaining / Math.max(1, days / 30)
        return `• ${goal.title}: kalan ${formatCurrency(remaining, 'TRY')}, hedef tarih ${goal.targetDate.toLocaleDateString('tr-TR')}, gereken aylık ${formatCurrency(monthly, 'TRY')}.`
    }).join('\n')
}

async function answerReportSummary(userId: string) {
    const [summary, plan, receivables, payables, cards, goals, healthSnapshot] = await Promise.all([
        getMonthlyBudgetSummary(userId),
        generatePaymentPlan(userId, 'SAFE'),
        prisma.receivablePayable.findMany({ where: { userId, type: 'RECEIVABLE', status: { not: 'CLOSED' } } }),
        prisma.receivablePayable.findMany({ where: { userId, type: 'PAYABLE', status: { not: 'CLOSED' } } }),
        prisma.creditCard.findMany({ where: { userId, status: 'ACTIVE' } }),
        prisma.financialGoal.findMany({ where: { userId, status: 'GOAL_ACTIVE' } }),
        prisma.healthSnapshot.findFirst({ where: { userId }, orderBy: { calculatedAt: 'desc' } }),
    ])

    const totalReceivable = receivables.reduce((sum: number, r) => sum + r.remainingAmount, 0)
    const totalPayable = payables.reduce((sum: number, r) => sum + r.remainingAmount, 0)
    const totalCardDebt = cards.reduce((sum: number, c) => sum + (c.currentDebt ?? 0), 0)
    const totalDebt = plan.items.reduce((sum: number, item) => sum + item.balance, 0)
    const totalGoalProgress = goals.length > 0 ? goals.reduce((sum: number, g) => sum + g.currentAmount, 0) : 0
    const totalGoalTarget = goals.length > 0 ? goals.reduce((sum: number, g) => sum + g.targetAmount, 0) : 0

    const sections: string[] = []

    // Sağlık skoru
    if (healthSnapshot) {
        sections.push(`📊 Finansal Sağlık Skoru: ${healthSnapshot.score}/100 | Net varlık: ${formatCurrency(healthSnapshot.netWorth, 'TRY')}`)
    }

    // Nakit akışı
    sections.push(`💰 Bu Ay Nakit Akışı:\n• Beklenen gelir: ${formatCurrency(summary.plannedIncome, 'TRY')}\n• Sabit giderler: ${formatCurrency(summary.fixedCommitments, 'TRY')}\n• Borç ödemeleri: ${formatCurrency(summary.debtCommitments, 'TRY')}\n• Serbest nakit: ${formatCurrency(summary.freeCash, 'TRY')}`)

    // Borç durumu
    if (totalDebt > 0) {
        sections.push(`🏦 Borç Durumu:\n• Toplam borç: ${formatCurrency(totalDebt, 'TRY')}\n• Kredi kartı borcu: ${formatCurrency(totalCardDebt, 'TRY')}\n• Aylık asgari ödeme: ${formatCurrency(plan.totalMinPayment, 'TRY')}\n• Tahmini bitiş: ${plan.estimatedFinishDate ? new Date(plan.estimatedFinishDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : '-'}`)
    }

    // Alacak / Verecek
    if (totalReceivable > 0 || totalPayable > 0) {
        sections.push(`👥 Alacak / Verecek:\n• Toplam alacak: ${formatCurrency(totalReceivable, 'TRY')} (${receivables.length} kayıt)\n• Toplam verecek: ${formatCurrency(totalPayable, 'TRY')} (${payables.length} kayıt)`)
    }

    // Hedefler
    if (goals.length > 0) {
        const avgProgress = Math.round((totalGoalProgress / Math.max(totalGoalTarget, 1)) * 100)
        sections.push(`🎯 Hedefler:\n• Aktif hedef: ${goals.length}\n• Toplam ilerleme: ${formatCurrency(totalGoalProgress, 'TRY')} / ${formatCurrency(totalGoalTarget, 'TRY')} (%${avgProgress})`)
    }

    // Risk değerlendirmesi
    const riskMessages: string[] = []
    if (summary.freeCash < 0) riskMessages.push('⚠️ Ay sonunda nakit açığı riski var.')
    if (plan.riskLevel === 'CRITICAL' || plan.riskLevel === 'HIGH') riskMessages.push('⚠️ Borç ödeme kapasitesi düşük. Kritik olmayan harcamaları ertele.')
    if (riskMessages.length > 0) sections.push(`\n${riskMessages.join('\n')}`)

    return sections.join('\n\n')
}

export async function answerFinanceAssistant(userId: string, prompt: string): Promise<string | null> {
    const intent = detectIntent(prompt)
    if (!intent) return null

    switch (intent) {
        case 'faiz_sorgusu':
            return answerInterest(userId)
        case 'borc_bitis_tahmini':
            return answerDebtFinish(userId)
        case 'aylik_odeme':
            return answerMonthlyPayments(userId)
        case 'alacak_sorgusu':
            return answerReceivables(userId)
        case 'verecek_sorgusu':
            return answerPayables(userId)
        case 'nakit_akisi':
            return answerCashflow(userId)
        case 'riskli_borclar':
            return answerRiskyDebts(userId)
        case 'hedef_durumu':
            return answerGoals(userId)
        case 'rapor_ozeti':
            return answerReportSummary(userId)
        default:
            return null
    }
}
