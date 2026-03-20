import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import AppShell from "@/components/AppShell";
import { FinanceProvider } from "@/components/FinanceContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ogzie Finans",
  description: "Kişisel finans yönetim paneli",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <AuthProvider>
          <FinanceProvider>
            <AppShell>{children}</AppShell>
          </FinanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
