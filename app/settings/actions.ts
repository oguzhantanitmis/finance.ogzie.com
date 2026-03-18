'use server'

import { revalidatePath } from 'next/cache'
import { setSetting } from '@/lib/settings-service'
import { getCurrentUser } from '@/lib/server-auth'

export async function saveOpenAIApiKeyAction(formData: FormData) {
    const user = await getCurrentUser()
    if (!user) throw new Error('Unauthorized')

    const apiKey = formData.get('apiKey') as string
    
    // Save to settings table using key 'ai.openai_api_key'
    await setSetting(user.id, 'ai.openai_api_key', apiKey, true) // isEncrypted = true is a good practice if supported

    revalidatePath('/settings')
    revalidatePath('/ai')
}
