import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import CurrencyProvider from "@/components/CurrencyProvider";
import { FinanceProvider } from "@/components/FinanceContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getUserDisplayCurrency } from "@/lib/currency-service";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ogzie Finans",
  description: "Kişisel finans yönetim paneli — Borç, alacak, bütçe ve nakit akışını tek panelden yönetin.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ogzie Finans",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const displayCurrency = await getUserDisplayCurrency();

  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-[family-name:var(--font-inter)] antialiased`}
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <FinanceProvider>
                <CurrencyProvider code={displayCurrency.code} rate={displayCurrency.rate}>
                  <AppShell>{children}</AppShell>
                </CurrencyProvider>
              </FinanceProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
