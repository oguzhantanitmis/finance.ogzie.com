import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PageShell from '@/components/PageShell'
import SettingsWorkspace from '@/components/settings/SettingsWorkspace'
import { getCardFinanceSettings } from '@/lib/card-finance-settings-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    let openAiKey = ''
    let aiModel = ''
    let aiBaseUrl = ''
    let cardSettingsData: Parameters<typeof SettingsWorkspace>[0]['cardSettings'] = null

    try {
        const cardSettings = await getCardFinanceSettings(user.id)
    
        // Opsiyonel AI ayarları
        try {
            const { getSetting } = await import('@/lib/settings-service')
            openAiKey = await getSetting(user.id, 'ai.openai_api_key') ?? ''
            aiModel = await getSetting(user.id, 'ai.model') ?? ''
            aiBaseUrl = await getSetting(user.id, 'ai.base_url') ?? ''
        } catch { /* ignore if unmigrated */ }
        
        if (cardSettings) {
            cardSettingsData = {
                contractualRate: cardSettings.contractualRate,
                defaultRate: cardSettings.defaultRate,
                cashAdvanceRate: cardSettings.cashAdvanceRate,
                minPaymentRateBelow50k: cardSettings.minPaymentRateBelow50k,
                minPaymentRateAbove50k: cardSettings.minPaymentRateAbove50k,
                kkdfRate: cardSettings.kkdfRate,
                bsmvRate: cardSettings.bsmvRate,
                notes: cardSettings.notes,
                lastUpdated: cardSettings.lastUpdated.toISOString(),
            }
        }
    } catch (e) {
        console.error('SettingsPage error:', e)
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
            <Navbar />
            <PageShell width="normal">
                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Ayarlar</h1>
                    <p className="text-zinc-400 max-w-3xl">
                        Genel kart faiz oranları ve uygulama ayarları.
                    </p>
                </header>
                <SettingsWorkspace cardSettings={cardSettingsData} openAiKey={openAiKey} aiModel={aiModel} aiBaseUrl={aiBaseUrl} />
            </PageShell>
        </div>
    )
}
