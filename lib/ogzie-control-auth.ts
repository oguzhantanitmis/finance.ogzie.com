import { verifyOgziePush } from '@/lib/ogzie-ingest-verify'

type ControlEnvelope = {
    version: number
    aud: string
    identity: { issuer: string; subject: string }
    [key: string]: unknown
}

export type OgzieControlAuthResult =
    | { ok: true; body: ControlEnvelope }
    | { ok: false; status: number; reason: string }

function requiredEnv(name: string): string | null {
    const value = process.env[name]?.trim()
    return value || null
}

/** Verify app.ogzie.com control requests before any database access. */
export async function authenticateOgzieControlRequest(request: Request): Promise<OgzieControlAuthResult> {
    const audience = requiredEnv('OGZIE_FINANCE_PUSH_AUDIENCE')
    const publicJwk = requiredEnv('OGZIE_FINANCE_PUSH_PUBLIC_JWK')
    const issuer = requiredEnv('OGZIE_APP_ISSUER')
    const subject = requiredEnv('OGZIE_APP_SUBJECT')
    if (!audience || !publicJwk || !issuer || !subject) {
        return { ok: false, status: 503, reason: 'control_not_configured' }
    }

    const rawBody = await request.text()
    const signature = verifyOgziePush(
        rawBody,
        request.headers.get('x-ogzie-timestamp'),
        request.headers.get('x-ogzie-signature'),
        { aud: audience, publicJwk },
    )
    if (!signature.ok) return { ok: false, status: 401, reason: signature.reason }

    let body: unknown
    try {
        body = JSON.parse(rawBody)
    } catch {
        return { ok: false, status: 400, reason: 'invalid_json' }
    }
    if (!body || typeof body !== 'object') {
        return { ok: false, status: 400, reason: 'invalid_envelope' }
    }

    const candidate = body as Partial<ControlEnvelope>
    if (
        candidate.version !== 2 ||
        candidate.aud !== audience ||
        !candidate.identity ||
        candidate.identity.issuer !== issuer ||
        candidate.identity.subject !== subject
    ) {
        return { ok: false, status: 403, reason: 'identity_mismatch' }
    }
    return { ok: true, body: candidate as ControlEnvelope }
}
