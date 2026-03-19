'use server'

import { getCurrentUser } from '@/lib/server-auth'
import { runProactiveAiAnalysis } from '@/lib/ai/ai-analyst'

export async function triggerAiAnalysisAction() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return { success: false, error: 'Oturum açmanız gerekiyor.' }
        }
        await runProactiveAiAnalysis(user.id)
        return { success: true }
    } catch (error: any) {
        console.error('AI Analysis Action Error:', error)
        return { success: false, error: error.message || 'Analiz sırasında bilinmeyen bir hata oluştu.' }
    }
}
