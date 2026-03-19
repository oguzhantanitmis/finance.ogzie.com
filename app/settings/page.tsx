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

    let aiSettings: {
        connectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR'
        model: string
        baseUrl: string
        hasProject: boolean
        hasOrg: boolean
    } = {
        connectionStatus: 'BEKLENİYOR',
        model: process.env.OPENAI_MODEL ?? 'gpt-3.5-turbo',
        baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        hasProject: !!process.env.OPENAI_PROJECT,
        hasOrg: !!process.env.OPENAI_ORG
    }
    let cardSettingsData: any = null

    try {
        const cardSettings = await getCardFinanceSettings(user.id)
    
        // AI Bağlantı Kontrolü
        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
            try {
                // OpenAI API'sini test et
                const res = await fetch(`${aiSettings.baseUrl}/models`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    next: { revalidate: 3600 }
                })
                if (res.ok) {
                    aiSettings.connectionStatus = 'HAZIR'
                } else {
                    aiSettings.connectionStatus = 'BAĞLANTI HATASI'
                }
            } catch {
                aiSettings.connectionStatus = 'BAĞLANTI HATASI'
            }
        }
        
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
                <SettingsWorkspace cardSettings={cardSettingsData} aiSettings={aiSettings} />
            </PageShell>
        </div>
    )
}
