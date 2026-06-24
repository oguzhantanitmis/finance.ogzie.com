"use client";

import { useState } from "react";
import OgzieSsoLoader from "@/components/OgzieSsoLoader";

/**
 * ÖRNEK — şablonu yerelde görsel test etmek için demo.
 * Bir route'a koy (ör. app/_demo/ogzie-loader/page.tsx) ve butonla
 * loading ↔ error geçişini gör. (Üretimde kaldır.)
 */
export default function OgzieSsoLoaderDemo() {
  const [state, setState] = useState<"loading" | "error">("loading");

  return (
    <>
      <OgzieSsoLoader
        state={state}
        brandInitial="M"
        primaryColor="#16a34a"
        message="ogzie ile giriş yapılıyor…"
      />
      <button
        onClick={() => setState((s) => (s === "loading" ? "error" : "loading"))}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/20"
      >
        Durumu değiştir ({state})
      </button>
    </>
  );
}
