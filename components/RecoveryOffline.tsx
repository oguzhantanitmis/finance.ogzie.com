'use client';
import { useEffect } from 'react';
export default function RecoveryOffline() {
 useEffect(() => {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/recovery-sw.js', { updateViaCache: 'none' }).catch(() => {});
 }, []);
 return null;
}
