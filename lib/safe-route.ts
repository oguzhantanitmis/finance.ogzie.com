// Preserve normal API/auth envelopes; sanitize only unexpected/server failures.
export function safeRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>, options: { errorEnvelope?: 'ogzie' } = {}) {
 return async (...args: A) => {
  const mutation = args[0] instanceof Request && !['GET', 'HEAD'].includes(args[0].method);
  try {
   const response = await handler(...args);
   // Signed integration routes have a fixed, reviewed error envelope.
   if (response.status < 500 || options.errorEnvelope === 'ogzie') return response;
   const headers = new Headers(response.headers); headers.delete('Content-Length');
   headers.set('Cache-Control', 'no-store');
   return Response.json({ error: 'Şu anda bağlantı kuramıyoruz. Biraz sonra tekrar deneyin.', ...(mutation ? { outcome: 'unknown' } : {}) }, { status: response.status, headers });
  } catch (error) {
   const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
   const unavailable = ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT'].includes(String(code));
   const errorBody = options.errorEnvelope === 'ogzie'
    ? { ok: false, error: unavailable ? 'service_unavailable' : 'internal_error', ...(mutation ? { outcome: 'unknown' } : {}) }
    : { error: unavailable ? 'Şu anda bağlantı kuramıyoruz. Biraz sonra tekrar deneyin.' : 'Bir sorun oluştu', ...(mutation ? { outcome: 'unknown' } : {}) };
   return Response.json(errorBody, { status: unavailable ? 503 : 500, headers: { 'Cache-Control': 'no-store' } });
  }
 };
}
