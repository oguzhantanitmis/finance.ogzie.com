import { redirect } from 'next/navigation'

import FinanceAssistantWorkspace from '@/components/ai/FinanceAssistantWorkspace'
import { requireSuperuser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export default async function AIPage() {
    try {
        await requireSuperuser()
    } catch {
        redirect('/')
    }

    return <FinanceAssistantWorkspace />
}
