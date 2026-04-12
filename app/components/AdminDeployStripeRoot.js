'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ADMIN_UI_DEPLOY_MARKER, getAdminBuildRef } from '@/lib/admin-deploy-marker';

function StripeInner() {
  const pathname = usePathname() || '';
  const [path, setPath] = useState('');

  useLayoutEffect(() => {
    try {
      const el = document.getElementById('cvneat-admin-inline-stripe');
      if (el) el.remove();
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setPath(typeof window !== 'undefined' ? window.location.pathname || '' : '');
  }, []);

  useEffect(() => {
    if (pathname) setPath(pathname);
  }, [pathname]);

  const active = (path || pathname).startsWith('/admin');
  if (!active) return null;

  const buildRef = getAdminBuildRef();

  return (
    <>
      <div
        suppressHydrationWarning
        className="fixed left-0 right-0 top-0 z-[2147483000] border-b-4 border-emerald-900 bg-emerald-600 px-2 py-2.5 text-center text-xs font-bold leading-tight text-white shadow-lg sm:text-sm"
        role="status"
        data-admin-deploy-root="1"
        data-admin-deploy-check={ADMIN_UI_DEPLOY_MARKER}
      >
        <span className="block sm:inline">Admin — build actif</span>{' '}
        <code className="mx-1 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs">
          {ADMIN_UI_DEPLOY_MARKER}
        </code>
        <code className="mx-1 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] sm:text-xs">
          {buildRef}
        </code>
      </div>
      <div className="h-[52px] shrink-0" aria-hidden="true" />
    </>
  );
}

/** Visible sur /admin même si le layout segment admin ne monte pas (cache, etc.). */
export default function AdminDeployStripeRoot() {
  return (
    <Suspense fallback={null}>
      <StripeInner />
    </Suspense>
  );
}
