'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shouldShowWorldCupChrome } from '@/lib/world-cup-campaign';

const WorldCupTheme = dynamic(() => import('./WorldCupTheme'), { ssr: false });
const WorldCupGlobalBanner = dynamic(() => import('./WorldCupGlobalBanner'), { ssr: false });

export default function WorldCupProvider({ enabled }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  const showChrome = enabled && shouldShowWorldCupChrome(pathname || '');

  useEffect(() => {
    setActive(showChrome);
    const root = document.documentElement;
    if (showChrome) {
      root.classList.add('wc-mode');
    } else {
      root.classList.remove('wc-mode');
    }
    return () => root.classList.remove('wc-mode');
  }, [showChrome]);

  if (!active) return null;

  return (
    <>
      <div className="wc-banner-slot">
        <WorldCupGlobalBanner />
      </div>
      <WorldCupTheme />
    </>
  );
}
