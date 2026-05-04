import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import SettingsWorkspace from '@/components/settings/SettingsWorkspace'
import { getCardFinanceSettings } from '@/lib/card-finance-settings-service'
import { DEFAULT_EVDS_SERIES, getEvdsSettings } from '@/lib/evds-service'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

interface AISettingsData {
    connectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR'
    model: string
    baseUrl: string
    hasProject: boolean
    hasOrg: boolean
}

interface CardSettingsData {
    contractualRate: number
    defaultRate: number
    cashAdvanceRate: number
    minPaymentRateBelow50k: number
    minPaymentRateAbove50k: number
    kkdfRate: number
    bsmvRate: number
    notes: string | null
    lastUpdated: string
}

export default async function SettingsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const aiSettings: AISettingsData = {
        connectionStatus: 'BEKLENİYOR',
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        hasProject: Boolean(process.env.OPENAI_PROJECT),
        hasOrg: Boolean(process.env.OPENAI_ORG),
    }
    let cardSettingsData: CardSettingsData | null = null
    const evdsSettings = await getEvdsSettings(user.id).catch(() => ({
        hasApiKey: false,
        cacheMinutes: 180,
        series: DEFAULT_EVDS_SERIES,
    }))

    try {
        const cardSettings = await getCardFinanceSettings(user.id)

        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
            try {
                const res = await fetch(`${aiSettings.baseUrl}/models`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    next: { revalidate: 3600 },
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
        <PageShell width="normal">
            <header className="mb-10">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Ayarlar</h1>
                <p className="text-zinc-400 max-w-3xl">
                    Genel kart faiz oranları ve uygulama ayarları.
                </p>
            </header>
            <SettingsWorkspace
                cardSettings={cardSettingsData}
                evdsSettings={evdsSettings}
                aiSettings={aiSettings}
                userProfile={{ name: user.name ?? '', email: user.email, createdAt: user.createdAt.toISOString() }}
            />
        </PageShell>
    )
}
