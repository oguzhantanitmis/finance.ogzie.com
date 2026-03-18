'use server'

import { revalidatePath } from 'next/cache'
import { setSetting } from '@/lib/settings-service'
import { getCurrentUser } from '@/lib/server-auth'

export async function saveOpenAIApiKeyAction(formData: FormData) {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    const apiKey = formData.get('apiKey') as string
    const aiModel = formData.get('aiModel') as string
    const aiBaseUrl = formData.get('aiBaseUrl') as string
    
    // Save to settings table
    if (apiKey) await setSetting(user.id, 'ai.openai_api_key', apiKey, true)
    if (aiModel) await setSetting(user.id, 'ai.model', aiModel)
    if (aiBaseUrl) await setSetting(user.id, 'ai.base_url', aiBaseUrl)

    revalidatePath('/settings')
    revalidatePath('/ai')
}
