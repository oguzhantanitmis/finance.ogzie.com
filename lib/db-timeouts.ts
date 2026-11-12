// Prisma's built-in PostgreSQL connector (v5/v6): cap pool/connect/query waits.
export function boundedDbUrl(url: string | undefined) {
 if (!url) return undefined;
 const parsed = new URL(url);
 for (const [key, limit] of Object.entries({ connect_timeout: 5, pool_timeout: 5, socket_timeout: 15 })) {
  const current = Number(parsed.searchParams.get(key));
  if (!Number.isFinite(current) || current <= 0 || current > limit) parsed.searchParams.set(key, String(limit));
 }
 return parsed.toString();
}

// Keep Prisma prototypes/codes used by idempotency handlers, but redact before
// an exception can reach Next's automatic server logger or an error boundary.
export function sanitizeDbFailure(value: unknown): Error & { code?: string } {
 const error = (value instanceof Error ? value : new Error()) as Error & { code?: string; meta?: unknown; cause?: unknown; errorCode?: string };
 const code = error.code ?? error.errorCode;
 const unavailable = error.name === 'PrismaClientInitializationError' || ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT'].includes(String(code));
 error.message = unavailable ? 'Şu anda bağlantı kuramıyoruz. Biraz sonra tekrar deneyin.' : 'Bir sorun oluştu';
 if (unavailable && !error.code) error.code = 'P1001';
 error.stack = undefined;
 delete error.meta; delete error.cause;
 return error;
}
