'use server'

import { getCurrentUser } from '@/lib/server-auth'
import { runProactiveAiAnalysis } from '@/lib/ai/ai-analyst'

export async function triggerAiAnalysisAction() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Oturum açmanız gerekiyor.')
    }
    await runProactiveAiAnalysis(user.id)
    return { success: true }
}
