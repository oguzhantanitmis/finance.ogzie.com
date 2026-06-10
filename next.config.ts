import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking koruması — uygulama hiçbir yerde iframe'lenmiyor
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing koruması
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Dış sitelere yalnızca origin gönder
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS zorunluluğu (1 yıl, alt alanlar dahil)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Kullanılmayan tarayıcı yeteneklerini kapat
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
