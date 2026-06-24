"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import OgzieSsoLoader from "@/components/OgzieSsoLoader";

/**
 * ogzie biletiyle otomatik giriş. Mevcut login akışıyla (redirect:false →
 * window.location.assign) aynı desen; "ogzie" Credentials provider'ını çağırır.
 * Görsel taşınabilir OgzieSsoLoader şablonundan gelir (auth mantığı burada kalır).
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

  // page.tsx tam ekran markalı zemini + haloları sağladığı için fullScreen=false.
  return <OgzieSsoLoader state={error ? "error" : "loading"} fullScreen={false} />;
}
