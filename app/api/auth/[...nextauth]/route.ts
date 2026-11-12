import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';
const handler = NextAuth(authOptions);
export const GET = handler;
export async function POST(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
 const response = await handler(request, context);
 // Credentials errors use NextAuth's redirect envelope. A DB outage is not HTTP401.
 const data = await response.clone().json().catch(() => null);
 const code = typeof data?.url === 'string' ? new URL(data.url, request.url).searchParams.get('error') : null;
 if (code === 'SERVICE_UNAVAILABLE') return new Response(response.body, { status: 503, headers: response.headers });
 return response;
}
