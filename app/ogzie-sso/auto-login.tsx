"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

/**
 * ogzie biletiyle otomatik giriş. Mevcut login akışıyla (redirect:false →
 * window.location.assign) aynı desen; "ogzie" Credentials provider'ını çağırır.
 * Bilet işlenirken markalı bir "sayfa yükleniyor" animasyonu gösterilir.
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

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center gap-6 max-w-sm px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent-danger-bg)", color: "var(--accent-danger)" }}
        >
          <AlertCircle className="w-8 h-8" />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            ogzie ile giriş başarısız
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Bağlantı geçersiz veya süresi dolmuş olabilir. Lütfen panelden tekrar deneyin.
          </p>
        </div>
        <a href="/login" className="btn-primary px-6 py-3">
          Giriş sayfasına dön
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      {/* Markalı logo + nabız glow */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-2xl blur-2xl"
          style={{ background: "var(--accent-primary)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl overflow-hidden"
          style={{ background: "var(--accent-primary)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          <span className="relative z-10 text-white font-bold text-3xl">O</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Zıplayan noktalar */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: "var(--accent-primary)" }}
              animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>
        <motion.p
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ogzie ile giriş yapılıyor…
        </motion.p>
      </div>
    </motion.div>
  );
}
