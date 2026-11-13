import { boundedDbUrl, sanitizeDbFailure } from './db-timeouts';
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  if (process.env.PRISMA_CLIENT_ENGINE_TYPE === 'binary') {
    delete process.env.PRISMA_CLIENT_ENGINE_TYPE
  }
  const client = new PrismaClient({
    log: [],
    ...(process.env.DATABASE_URL ? { datasources: { db: { url: boundedDbUrl(process.env.DATABASE_URL)! } } } : {}),
  })
  client.$use(async (params, next) => {
    try { return await next(params) } catch (error) { throw sanitizeDbFailure(error) }
  })
  return client
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

/**
 * Geçici DB bağlantı hataları için otomatik retry.
 * Vercel serverless cold-start veya Plesk MariaDB anlık tıkanması için kullanılır.
 *
 * Kullanım:
 *   const data = await withDbRetry(() => prisma.user.findUnique({ where: { id } }))
 */
export async function withDbRetry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; delayMs?: number } = {}
): Promise<T> {
    const retries = options.retries ?? 2
    const delay = options.delayMs ?? 300

    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err
            const isConnectionError = isDbConnectionError(err)
            if (!isConnectionError || attempt === retries) throw err
            // Üstel bekleme: 300ms, 600ms, 1200ms
            await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)))
        }
    }
    throw lastError
}

/** DB bağlantı hatası mı? UI tarafında friendly mesaj göstermek için. */
export function isDbConnectionError(err: unknown): boolean {
    if (!(err instanceof Error)) return false
    const code = 'code' in err ? String(err.code) : ''
    const m = err.message
    return (
        ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code) ||
        m.includes("Can't reach database server") ||
        m.includes('Connection refused') ||
        m.includes('ECONNREFUSED') ||
        m.includes('ETIMEDOUT') ||
        m.includes('PrismaClientInitializationError') ||
        err.name === 'PrismaClientInitializationError'
    )
}
