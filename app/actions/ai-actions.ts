'use server'

import { requireSuperuser } from '@/lib/server-auth'
import { runProactiveAiAnalysis } from '@/lib/ai/ai-analyst'

export async function triggerAiAnalysisAction() {
    try {
        const user = await requireSuperuser()
        await runProactiveAiAnalysis(user.id)
        return { success: true }
    } catch (error) {
        console.error('AI Analysis Action Error:', error)
        const message = error instanceof Error ? error.message : 'Analiz sırasında bilinmeyen bir hata oluştu.'
        return { success: false, error: message }
    }
}
