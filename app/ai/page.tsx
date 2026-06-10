import { redirect } from 'next/navigation'
import { getAlgorithmicInsights, generateAvalancheInsights } from '@/app/actions/ai-actions'
import InsightCard from '@/components/ai/InsightCard'
import AssistantMobile from '@/components/ai/AssistantMobile'
import { currentPeriod } from '@/lib/ai-usage'
import { isSuperuser } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/server-auth'
import { Wand2, BrainCircuit } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AIPage() {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/login')
    }

    // Attempt to generate new algorithmic insights on load
    await generateAvalancheInsights()
    const { insights } = await getAlgorithmicInsights()

    // /api/ai superuser korumalı — chat yalnız AI kullanabilenlere
    const canUseAi = isSuperuser(user)
    const usageRow = canUseAi
        ? await prisma.aiUsage.findUnique({
              where: { userId_period: { userId: user.id, period: currentPeriod() } },
              select: { totalTokens: true },
          }).catch(() => null)
        : null

    const insightsView = (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6 md:p-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-zinc-800/50 pb-8">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                        <BrainCircuit className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Yapay Zeka Finans Asistanı
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            Likit varlıklarınız ve borçlarınız Avalanche algoritması ile analiz ediliyor.
                        </p>
                    </div>
                </div>
            </div>

            {/* Insights Container */}
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-purple-400" /> Güncel Stratejiler
                    </h2>
                </div>

                {!insights || insights.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800/50 border-dashed">
                        <BrainCircuit className="w-12 h-12 text-zinc-600 mb-4" />
                        <h3 className="text-lg font-bold text-zinc-400">Analiz Edilecek Veri Bulunamadı</h3>
                        <p className="text-sm text-zinc-500 mt-2 max-w-md">
                            Size finansal stratejiler sunabilmem için lütfen sisteme nakit varlıklarınızı, kredi kartlarınızı veya borçlarınızı ekleyin.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {insights.map((insight) => (
                            <InsightCard key={insight.id} insight={insight} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <>
            {/* Mobil: chat üst bar (57px) ile alt tab bar (72px) arasını doldurur */}
            <div className="lg:hidden px-4 pt-3 pb-2 h-[calc(100dvh-57px-72px-env(safe-area-inset-bottom))] flex flex-col">
                {canUseAi ? (
                    <AssistantMobile
                        used={usageRow?.totalTokens ?? 0}
                        limit={user.aiMonthlyTokenLimit}
                    />
                ) : (
                    insightsView
                )}
            </div>
            <div className="hidden lg:block">{insightsView}</div>
        </>
    )
}
