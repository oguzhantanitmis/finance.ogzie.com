/**
 * Basit bellek-içi rate limiter (sabit pencere).
 * Serverless'ta instance başına çalışır (Fluid Compute instance'ları
 * istekler arasında yeniden kullanıldığı için pratikte etkilidir);
 * tek sunuculu dağıtımlarda tam koruma sağlar. Dağıtık kesinlik
 * gerekirse Redis/Upstash'e taşınabilir — arayüz aynı kalır.
 */

const buckets = new Map<string, { count: number; resetAt: number }>()
const MAX_BUCKETS = 10_000

function sweep(now: number) {
    if (buckets.size < MAX_BUCKETS) return
    for (const [key, bucket] of buckets) {
        if (bucket.resetAt < now) buckets.delete(key)
    }
}

/** true = izin var, false = limit aşıldı */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    sweep(now)
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt < now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs })
        return true
    }
    if (bucket.count >= limit) return false
    bucket.count += 1
    return true
}

/** İstekten istemci IP'si — proxy arkasında x-forwarded-for'un ilk değeri */
export function clientIp(req: Request): string {
    const fwd = req.headers.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    return req.headers.get('x-real-ip') ?? 'unknown'
}
