'use client';

import PartnerImportantInfoOverlay from '@/components/PartnerImportantInfoOverlay';
import PartnerErrorBoundary from '@/components/PartnerErrorBoundary';
import { useEffect } from 'react';
import { isLegacyAndroid } from '@/lib/compat';

/** Shell partenaire — overlay info + garde-fou crash Sunmi. */
export default function PartnerLegacyShell({ children }) {
  useEffect(() => {
    if (!isLegacyAndroid()) return;
    const onError = (event) => {
      console.error('[Sunmi] Erreur JS non gérée:', event?.message || event);
    };
    const onRejection = (event) => {
      console.error('[Sunmi] Promise rejetée:', event?.reason?.message || event?.reason);
      event.preventDefault?.();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <PartnerErrorBoundary>
      <PartnerImportantInfoOverlay>{children}</PartnerImportantInfoOverlay>
    </PartnerErrorBoundary>
  );
}
