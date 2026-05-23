import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  if (process.env.PRISMA_CLIENT_ENGINE_TYPE === 'binary') {
    delete process.env.PRISMA_CLIENT_ENGINE_TYPE
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })
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
            const message = err instanceof Error ? err.message : ''
            const isConnectionError =
                message.includes("Can't reach database server") ||
                message.includes('Connection refused') ||
                message.includes('ECONNREFUSED') ||
                message.includes('ETIMEDOUT') ||
                message.includes('PrismaClientInitializationError')

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
    const m = err.message
    return (
        m.includes("Can't reach database server") ||
        m.includes('Connection refused') ||
        m.includes('ECONNREFUSED') ||
        m.includes('ETIMEDOUT') ||
        m.includes('PrismaClientInitializationError') ||
        err.name === 'PrismaClientInitializationError'
    )
}
