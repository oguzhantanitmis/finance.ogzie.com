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

    let aiConnectionStatus: 'HAZIR' | 'BAĞLANTI HATASI' | 'BEKLENİYOR' = 'BEKLENİYOR'
    let cardSettingsData: Parameters<typeof SettingsWorkspace>[0]['cardSettings'] = null

    try {
        const cardSettings = await getCardFinanceSettings(user.id)
    
        // AI Bağlantı Kontrolü (Sadece OPENAI_API_KEY var mı ve çalışıyor mu)
        const apiKey = process.env.OPENAI_API_KEY
        if (apiKey) {
            try {
                // OpenAI API'sini test et (Modelleri listele)
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    next: { revalidate: 3600 } // Saatte bir test et, her sayfaya girişte değil
                })
                if (res.ok) {
                    aiConnectionStatus = 'HAZIR'
                } else {
                    aiConnectionStatus = 'BAĞLANTI HATASI'
                }
            } catch {
                aiConnectionStatus = 'BAĞLANTI HATASI'
            }
        } else {
            aiConnectionStatus = 'BEKLENİYOR'
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
                <SettingsWorkspace cardSettings={cardSettingsData} aiConnectionStatus={aiConnectionStatus} />
            </PageShell>
        </div>
    )
}
