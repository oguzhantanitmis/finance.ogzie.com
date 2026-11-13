'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Recovery uses a fresh GET outside a potentially broken router. */
import { useEffect, useRef } from 'react';
import './recovery.css';
const messages = {"not-found": "Bu sayfayı bulamadık", "forbidden": "Bu sayfaya erişim izniniz yok", "unauthorized": "Devam etmek için giriş yapın", "unavailable": "Şu anda bağlantı kuramıyoruz. Biraz sonra tekrar deneyin.", "error": "Bir sorun oluştu"};

export type BoundaryProps = { error: unknown; retry?: () => void; reset?: () => void };
type Props = { kind?: keyof typeof messages; onRetry?: () => void };


export default function Recovery({ kind = 'error', onRetry }: Props) {
 const copy = messages;
 const region = useRef<HTMLElement>(null);
 useEffect(() => { region.current?.focus(); }, []);
 const code = kind === 'not-found' ? '404' : kind === 'forbidden' ? '403' : kind === 'unauthorized' ? '401' : kind === 'unavailable' ? '503' : '500';
 return (
  <section className="recovery" role="alert" aria-labelledby="recovery-title" tabIndex={-1} ref={region}>
   <h1 id="recovery-title">{copy[kind]}</h1>
   <p>{code} · {'Bağlantınızı kontrol edin veya ana sayfaya dönün.'}</p>
   <div className="recovery-actions">
    {onRetry && <button type="button" onClick={onRetry}>{'Tekrar dene'}</button>}
    {kind === 'unauthorized' && <a href="/login">{'Giriş yap'}</a>}
    <a href="/">{'Ana sayfaya dön'}</a>
   </div>
  </section>
 );
}
