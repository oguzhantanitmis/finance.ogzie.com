import { getDashboardData } from '@/lib/dashboard-service'
import type { GoalWithProgress } from '@/lib/goal-service'
import { getActiveGoalForDashboard } from '@/lib/goal-service'
import { calculateHealthScore } from '@/lib/health-score-service'
import { getMonthlyBudgetSummary } from '@/lib/monthly-planner'

export interface DashboardInsight {
    id: string
    type: 'ALERT' | 'WARNING' | 'INFO' | 'SUCCESS'
    title: string
    content: string
    href?: string
    actionLabel?: string
}

export async function getDashboardInsights(
    userId: string,
    input?: {
        summary?: Awaited<ReturnType<typeof getMonthlyBudgetSummary>>
        dashboardData?: Awaited<ReturnType<typeof getDashboardData>>
        healthScore?: Awaited<ReturnType<typeof calculateHealthScore>>
        activeGoal?: GoalWithProgress | null
    },
): Promise<DashboardInsight[]> {
    const [summary, dashboardData, healthScore, activeGoal] = await Promise.all([
        input?.summary ? Promise.resolve(input.summary) : getMonthlyBudgetSummary(userId),
        input?.dashboardData ? Promise.resolve(input.dashboardData) : getDashboardData(userId),
        input?.healthScore ? Promise.resolve(input.healthScore) : calculateHealthScore(userId),
        input?.activeGoal !== undefined ? Promise.resolve(input.activeGoal) : getActiveGoalForDashboard(userId),
    ])

    const insights: DashboardInsight[] = []

    if (summary.incomeSources.length === 0) {
        insights.push({
            id: 'missing-income',
            type: 'ALERT',
            title: 'Gelir kaydı eksik',
            content: 'Düzenli gelir kaydı olmadan serbest nakit ve aylık denge hesabı eksik kalır.',
            href: '/budget',
            actionLabel: 'Gelir ekle',
        })
    }

    if (summary.freeCash < 0) {
        insights.push({
            id: 'negative-free-cash',
            type: 'ALERT',
            title: 'Serbest nakit eksiye düşüyor',
            content: `Bu ay sabit yükler ve borç ödemeleri sonrasında ${Math.abs(summary.freeCash).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} açık oluşuyor.`,
            href: '/budget',
            actionLabel: 'Bütçeyi düzelt',
        })
    } else if (summary.freeCash > 0) {
        insights.push({
            id: 'positive-free-cash',
            type: 'SUCCESS',
            title: 'Aylık denge pozitif',
            content: `Bu ay yüklerden sonra ${summary.freeCash.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} serbest alan kalıyor.`,
            href: '/budget',
            actionLabel: 'Detayları gör',
        })
    }

    if (summary.upcomingObligations.length > 0) {
        const nextObligation = summary.upcomingObligations[0]
        insights.push({
            id: 'next-obligation',
            type: 'WARNING',
            title: 'Yaklaşan ödeme takibi gerekli',
            content: `${nextObligation.name} için sıradaki ödeme ${new Date(nextObligation.dueDate).toLocaleDateString('tr-TR')} tarihinde.`,
            href: '/budget',
            actionLabel: 'Ödemeleri gör',
        })
    }

    if (dashboardData.totalCardDebt > dashboardData.availableCash && dashboardData.availableCash > 0) {
        insights.push({
            id: 'card-pressure',
            type: 'WARNING',
            title: 'Kart borcu nakit alanı zorluyor',
            content: 'Toplam kart borcun, kullanılabilir nakit alanını aşıyor. Minimum ödeme planını gözden geçir.',
            href: '/cards',
            actionLabel: 'Kartları aç',
        })
    }

    if (dashboardData.overdueCount > 0) {
        insights.push({
            id: 'overdue-rp',
            type: 'ALERT',
            title: 'Geciken kişi kaydı var',
            content: `${dashboardData.overdueCount} kişi/alacak-verecek kaydı gecikmiş görünüyor.`,
            href: '/people',
            actionLabel: 'Kişileri aç',
        })
    }

    if (healthScore.score < 45) {
        insights.push({
            id: 'health-risk',
            type: 'WARNING',
            title: 'Finansal sağlık baskı altında',
            content: `Sağlık puanı ${healthScore.score}. Kredi kartı kullanımı, borç oranı veya nakit akışı tarafında toparlama gerekli.`,
            href: '/health',
            actionLabel: 'Sağlık puanını gör',
        })
    }

    if (activeGoal) {
        insights.push({
            id: 'active-goal',
            type: activeGoal.progressPercent >= 75 ? 'SUCCESS' : 'INFO',
            title: 'Aktif hedef takibi',
            content: `${activeGoal.title} hedefinde ilerleme oranı %${activeGoal.progressPercent}.`,
            href: '/goals',
            actionLabel: 'Hedefe git',
        })
    }

    return insights.slice(0, 4)
}
