import { jwtVerify, createRemoteJWKSet } from "jose";

/**
 * ogzie SSO doğrulayıcı (finance.ogzie tarafı).
 * ogzie.com bir EdDSA imzalı, tek-kullanımlık, audience-bound bilet üretir;
 * burada imzayı ogzie JWKS ile doğrular ve jti'yi ogzie'de tüketiriz.
 *
 * Not: bu proje jose v4 kullanıyor → `requiredClaims` (v5+) yok; jti/sub
 * için açık guard koyuyoruz.
 *
 * ENV:
 *   OGZIE_ISSUER          (örn. https://ogzie.com)
 *   OGZIE_SSO_AUDIENCE    (bu uygulamanın origin'i, örn. https://finance.ogzie.com)
 *   OGZIE_SSO_APP_SECRET  (ogzie /ayarlar/uygulamalar'dan üretilen per-app secret)
 */
const ISSUER = process.env.OGZIE_ISSUER ?? "";
const AUDIENCE = process.env.OGZIE_SSO_AUDIENCE ?? "";
const APP_SECRET = process.env.OGZIE_SSO_APP_SECRET ?? "";
const TICKET_TYP = "ogzie-sso+jwt";

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwksCache) {
    jwksCache = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
  }
  return jwksCache;
}

export function isOgzieSsoConfigured(): boolean {
  return Boolean(ISSUER && AUDIENCE && APP_SECRET);
}

/**
 * Bileti doğrular VE ogzie'de jti'yi atomik tüketir (tek-kullanım/replay koruması).
 * Geçerliyse { sub, email }, değilse null. `email` = ogzie'nin bu panel için
 * belirlediği hesap (per-app override ya da global varsayılan). Bilet EdDSA
 * imzalı + audience-bound olduğundan claim güvenilir. `email` claim'i yoksa
 * (ogzie henüz email göndermeyen eski sürümdeyse) null döner → çağıran env/
 * varsayılana düşebilir (deploy-sırası sağlamlığı).
 */
export async function verifyAndConsumeOgzieTicket(
  token: string,
): Promise<{ sub: string; email: string | null } | null> {
  if (!isOgzieSsoConfigured()) return null;

  let jti: string;
  let sub: string;
  let email: string | null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["EdDSA"],
      typ: TICKET_TYP,
      maxTokenAge: "60s",
      clockTolerance: "30s",
    });
    // jose v4: requiredClaims yok → açık guard. email opsiyonel (geriye-uyum).
    if (!payload.jti || !payload.sub || !payload.iss || !payload.aud) return null;
    jti = String(payload.jti);
    sub = String(payload.sub);
    email = payload.email ? String(payload.email) : null;
  } catch {
    return null;
  }

  // jti'yi ogzie'de tüket (server-to-server; app secret ile).
  try {
    const res = await fetch(`${ISSUER}/api/sso/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ogzie-app-secret": APP_SECRET,
      },
      body: JSON.stringify({ jti, aud: AUDIENCE }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!res.ok || !data?.ok) return null;
  } catch {
    return null;
  }

  return { sub, email };
}
