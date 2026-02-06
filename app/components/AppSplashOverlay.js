/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';

function isCapacitorLike() {
  try {
    if (typeof window === 'undefined') return false;
    const href = window.location?.href || '';
    const protocol = window.location?.protocol || '';
    return (
      protocol === 'capacitor:' ||
      href.startsWith('capacitor://') ||
      href.startsWith('file://') ||
      !!window.Capacitor
    );
  } catch {
    return false;
  }
}

export default function AppSplashOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [phase, setPhase] = useState('hidden'); // visible | exiting | hidden

  useEffect(() => {
    // iOS: window.Capacitor peut arriver après coup, donc on attend un peu.
    if (isCapacitorLike()) {
      setEnabled(true);
      setPhase('visible');
      return;
    }

    const start = Date.now();
    const t = setInterval(() => {
      if (isCapacitorLike()) {
        setEnabled(true);
        setPhase('visible');
        clearInterval(t);
        return;
      }
      if (Date.now() - start > 6000) {
        clearInterval(t);
      }
    }, 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const hide = () => {
      setPhase((p) => {
        if (p === 'hidden' || p === 'exiting') return p;
        return 'exiting';
      });
      // fin animation
      setTimeout(() => setPhase('hidden'), 650);
    };

    const onReady = () => hide();
    window.addEventListener('cvneat-boot-done', onReady);

    // fallback: ne jamais bloquer indéfiniment
    const fallback = setTimeout(() => hide(), 5000);

    return () => {
      window.removeEventListener('cvneat-boot-done', onReady);
      clearTimeout(fallback);
    };
  }, [enabled]);

  if (!enabled || phase === 'hidden') return null;

  const isExiting = phase === 'exiting';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden="true"
    >
      <div
        className={[
          'flex flex-col items-center justify-center',
          'transition-all duration-600 ease-out',
          isExiting ? 'opacity-0 scale-[1.65]' : 'opacity-100 scale-100',
        ].join(' ')}
      >
        <img
          src="/icon-512x512.svg"
          alt="CVNEAT"
          className="w-40 h-40"
          draggable={false}
        />
        <div className="mt-5 text-gray-900 font-extrabold tracking-wide text-2xl">
          CVNEAT
        </div>
      </div>
    </div>
  );
}

