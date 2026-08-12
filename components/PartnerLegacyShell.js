'use client';

import PartnerImportantInfoOverlay from '@/components/PartnerImportantInfoOverlay';

/** Shell partenaire — overlay info uniquement (plus de bandeau « Chargement lent »). */
export default function PartnerLegacyShell({ children }) {
  return <PartnerImportantInfoOverlay>{children}</PartnerImportantInfoOverlay>;
}
