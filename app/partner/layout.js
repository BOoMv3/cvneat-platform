import Script from 'next/script';
import PartnerLegacyShell from '@/components/PartnerLegacyShell';

export default function PartnerLayout({ children }) {
  return (
    <>
      <Script src="/legacy-polyfills.js" strategy="beforeInteractive" />
      <PartnerLegacyShell>{children}</PartnerLegacyShell>
    </>
  );
}
