'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker (public/sw.js) after the page mounts.
 * Production only: caching every asset in development would fight against
 * hot reloading.
 */
export default function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is non-fatal — the app simply won't work offline
    });
  }, []);

  return null;
}
