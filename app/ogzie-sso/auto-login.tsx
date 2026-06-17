"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * ogzie biletiyle otomatik giriş. Mevcut login akışıyla (redirect:false →
 * window.location.assign) aynı desen; "ogzie" Credentials provider'ını çağırır.
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

  return (
    <p className="text-sm text-gray-500">
      {error
        ? "ogzie ile giriş başarısız oldu. Lütfen panelden tekrar deneyin."
        : "ogzie ile giriş yapılıyor…"}
    </p>
  );
}
