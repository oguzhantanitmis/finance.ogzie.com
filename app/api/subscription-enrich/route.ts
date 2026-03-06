import { NextResponse } from 'next/server'

import { enrichSubscriptionName } from '@/lib/subscription-enrichment'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const body = (await req.json()) as { name?: string }
    const name = body.name?.trim()

    if (!name) {
        return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 })
    }

    return NextResponse.json(enrichSubscriptionName(name))
}
