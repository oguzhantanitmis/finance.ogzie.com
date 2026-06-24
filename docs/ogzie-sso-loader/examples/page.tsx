import OgzieSsoLoader from "@/components/OgzieSsoLoader";
import { OgzieAutoLogin } from "./auto-login";

export const dynamic = "force-dynamic";

/**
 * ÖRNEK — Next.js App Router SSO sayfası.
 * ogzie launcher buraya yönlendirir: /ogzie-sso?token=<bilet>.
 *
 * ⚠️ ÖNEMLİ: Uygulamanın global bir layout/shell'i (sidebar + üst bar) varsa
 * bu rotayı muaf tut ki yükleme ekranının arkasında boş shell görünmesin.
 * Örn. AppShell'de:
 *   const PUBLIC_PATHS = new Set(["/login", "/ogzie-sso"]);
 *   if (PUBLIC_PATHS.has(pathname)) return <>{children}</>;
 */
export default async function OgzieSsoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <OgzieSsoLoader
        state="error"
        errorTitle="Geçersiz SSO bağlantısı"
        errorMessage="Bağlantı eksik veya hatalı. Lütfen panelden tekrar deneyin."
      />
    );
  }

  return <OgzieAutoLogin token={token} />;
}
