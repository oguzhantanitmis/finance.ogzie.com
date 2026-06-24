import { OgzieAutoLogin } from "./auto-login";

export const dynamic = "force-dynamic";

/**
 * ogzie launcher buraya yönlendirir: /ogzie-sso?token=<bilet>.
 * Bilet doğrulanıp panele giriş yapılır (mevcut e-posta/şifre girişine alternatif).
 * AppShell bu rotada gizlenir (PUBLIC_PATHS) → tam ekran markalı yükleme animasyonu.
 */
export default async function OgzieSsoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div
      className="relative min-h-dvh flex items-center justify-center p-6 overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Arka plan haloları (login ile tutarlı) */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-primary), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-24 w-[460px] h-[460px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, var(--accent-purple), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10">
        {token ? (
          <OgzieAutoLogin token={token} />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Geçersiz SSO bağlantısı.
          </p>
        )}
      </div>
    </div>
  );
}
