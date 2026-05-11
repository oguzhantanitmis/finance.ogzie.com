import { NextResponse } from 'next/server'

import { enrichSubscriptionName } from '@/lib/subscription-enrichment'
import { requireCurrentUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        await requireCurrentUser()
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { name?: string }
    try {
        body = (await req.json()) as { name?: string }
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const name = body.name?.trim()

    if (!name) {
        return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 })
    }

    if (name.length > 120) {
        return NextResponse.json({ error: 'Subscription name is too long' }, { status: 400 })
    }

    return NextResponse.json(enrichSubscriptionName(name))
}
