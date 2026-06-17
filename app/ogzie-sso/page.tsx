import { OgzieAutoLogin } from "./auto-login";

export const dynamic = "force-dynamic";

/**
 * ogzie launcher buraya yönlendirir: /ogzie-sso?token=<bilet>.
 * Bilet doğrulanıp panele giriş yapılır (mevcut e-posta/şifre girişine alternatif).
 */
export default async function OgzieSsoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center p-6 text-center">
      {token ? (
        <OgzieAutoLogin token={token} />
      ) : (
        <p className="text-sm text-gray-500">Geçersiz SSO bağlantısı.</p>
      )}
    </div>
  );
}
