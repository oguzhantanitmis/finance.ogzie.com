import { redirect } from 'next/navigation'
import PageShell from '@/components/PageShell'
import SettingsWorkspace from '@/components/settings/SettingsWorkspace'
import { getCardFinanceSettings, normalizeFractionRate } from '@/lib/card-finance-settings-service'
import { DEFAULT_EVDS_SERIES, getEvdsSettings } from '@/lib/evds-service'
import { isSuperuser } from '@/lib/authz'
import { getCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')
    const canUseAi = isSuperuser(user)

    // AI durumu: ağ çağrısı yapmadan env bazlı hızlı kontrol
    const aiSettings = {
        isConfigured: Boolean(process.env.OPENAI_API_KEY),
        model:        process.env.OPENAI_MODEL      ?? 'gpt-4o-mini',
        baseUrl:      process.env.OPENAI_BASE_URL   ?? 'https://api.openai.com/v1',
        hasProject:   Boolean(process.env.OPENAI_PROJECT),
        hasOrg:       Boolean(process.env.OPENAI_ORG),
    }

    const [cardSettings, evdsSettings] = await Promise.all([
        getCardFinanceSettings(user.id).catch(() => null),
        getEvdsSettings(user.id).catch(() => ({
            hasApiKey: false,
            apiKeySource: 'none' as const,
            cacheMinutes: 180,
            series: DEFAULT_EVDS_SERIES,
        })),
    ])

    const cardSettingsData = cardSettings ? {
        contractualRate:       cardSettings.contractualRate,
        defaultRate:           cardSettings.defaultRate,
        cashAdvanceRate:       cardSettings.cashAdvanceRate,
        minPaymentRateBelow50k: normalizeFractionRate(cardSettings.minPaymentRateBelow50k, 0.2),
        minPaymentRateAbove50k: normalizeFractionRate(cardSettings.minPaymentRateAbove50k, 0.4),
        kkdfRate:              normalizeFractionRate(cardSettings.kkdfRate, 0.15),
        bsmvRate:              normalizeFractionRate(cardSettings.bsmvRate, 0.15),
        notes:                 cardSettings.notes,
        lastUpdated:           cardSettings.lastUpdated.toISOString(),
    } : null

    return (
        <PageShell width="normal">
            <header className="mb-8">
                <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--text-muted)' }}>Finans paneli</p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Ayarlar</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Hesap, güvenlik, tercihler ve faiz oranları.
                </p>
            </header>
            <SettingsWorkspace
                cardSettings={cardSettingsData}
                evdsSettings={evdsSettings}
                aiSettings={aiSettings}
                canUseAi={canUseAi}
                userProfile={{
                    name: user.name ?? '',
                    email: user.email,
                    createdAt: user.createdAt.toISOString(),
                    preferredCurrency: user.preferredCurrency ?? 'TRY',
                    locale: user.locale ?? 'tr-TR',
                    timezone: user.timezone ?? 'Europe/Istanbul',
                }}
            />
        </PageShell>
    )
}
