"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import OgzieSsoLoader from "@/components/OgzieSsoLoader";

/**
 * ÖRNEK — ogzie biletiyle otomatik giriş (NextAuth "ogzie" credentials provider).
 * Görsel OgzieSsoLoader şablonundan gelir; auth mantığı burada kalır.
 *
 * Marka rengi/harfi:
 *   - Token'lı sistemde (--accent-primary vb.) bir şey geçmene gerek yok.
 *   - Token'sızsa prop ile geç:
 *       <OgzieSsoLoader ... primaryColor="#16a34a" brandInitial="M" />
 */
export function OgzieAutoLogin({ token }: { token: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    signIn("ogzie", { token, redirect: false })
      .then((res) => {
        if (cancelled) return;
        if (res?.error) setError(true);
        else window.location.assign("/");
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return <OgzieSsoLoader state={error ? "error" : "loading"} brandInitial="O" />;
}
