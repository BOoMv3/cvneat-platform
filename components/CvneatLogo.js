'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CvneatLogo({ size = 'md', href = '/', className = '' }) {
  const sizes = {
    sm: { img: 36, cls: 'h-9 w-9' },
    md: { img: 48, cls: 'h-12 w-12' },
    lg: { img: 64, cls: 'h-16 w-16' },
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
