'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CvneatLogo({ size = 'md', href = '/', className = '' }) {
  const sizes = {
    sm: { img: 56, cls: 'h-14 w-14' },
    md: { img: 80, cls: 'h-20 w-20' },
    lg: { img: 112, cls: 'h-28 w-28' },
    xl: { img: 180, cls: 'h-40 w-40 sm:h-44 sm:w-44' },
    xxl: { img: 220, cls: 'h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64' },
  };
  const s = sizes[size] || sizes.md;

  const img = (
    <Image
      src="/cvneat-logo.png"
      alt="CVN'EAT — La livraison locale qui vous régale"
      width={s.img}
      height={s.img}
      className={`${s.cls} object-contain bg-transparent ${className}`}
      priority
      unoptimized
    />
  );

  if (!href) return img;
  return (
    <Link href={href} className="inline-flex shrink-0 focus:outline-none">
      {img}
    </Link>
  );
}
