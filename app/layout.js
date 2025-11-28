import './globals.css';
import { Inter } from 'next/font/google';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import FacebookPixel from '@/components/FacebookPixel';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import ChristmasTheme from '@/components/ChristmasTheme';

// Importer l'intercepteur pour l'app mobile (s'exécute côté client uniquement)
if (typeof window !== 'undefined') {
  require('../lib/fetch-interceptor');
}

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CVN\'EAT - Livraison de repas à domicile | Restaurants partenaires',
  description: 'CVN\'EAT, votre plateforme de livraison de repas à domicile. Commandez vos plats préférés auprès des meilleurs restaurants partenaires. Livraison rapide, service de qualité. Disponible dans toute la France. Application regroupant des restaurants, mettant en lien des livreurs de repas.',
  keywords: 'livraison repas, commande à domicile, restaurant livraison, CVN\'EAT, plat livraison, livreur repas, commande restaurant, livraison rapide, plateforme livraison, application livraison repas',
  authors: [{ name: 'CVN\'EAT' }],
  creator: 'CVN\'EAT',
  publisher: 'CVN\'EAT',
  applicationName: 'CVN\'EAT',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cvneat.fr'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CVN\'EAT - Livraison de repas à domicile',
    description: 'Commandez vos plats préférés et faites-vous livrer à domicile. Restaurants partenaires, livraison rapide et service de qualité. Application de livraison de repas.',
    url: 'https://cvneat.fr',
    siteName: 'CVN\'EAT',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CVN\'EAT - Plateforme de livraison de repas à domicile',
      },
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'CVN\'EAT - Plateforme de livraison de repas à domicile',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVN\'EAT - Livraison de repas à domicile',
    description: 'Commandez vos plats préférés et faites-vous livrer à domicile. Restaurants partenaires, livraison rapide.',
    images: ['/og-image.jpg', '/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // À remplacer par le code de vérification Google Search Console
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'CVN\'EAT',
  },
};

export default function RootLayout({ children }) {
  if (typeof window !== 'undefined') {
    window.supabase = supabase;
  }

  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Favicons et icônes */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/icon-32x32.svg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/svg+xml" sizes="192x192" href="/icon-192x192.svg" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="icon" type="image/svg+xml" sizes="512x512" href="/icon-512x512.svg" />
        
        {/* Theme colors */}
        <meta name="theme-color" content="#ea580c" />
        <meta name="msapplication-TileColor" content="#ea580c" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Apple PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CVN'EAT" />
        
        {/* Google Search Console */}
        <meta name="google-site-verification" content="your-google-verification-code" />
        
        {/* Additional SEO */}
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="Ganges" />
        <meta name="geo.position" content="43.9333;3.7075" />
        <meta name="ICBM" content="43.9333, 3.7075" />
        
        {/* Business information */}
        <meta name="contact" content="contact@cvneat.fr" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />
      </head>
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider>
          <FacebookPixel />
          {/* 🎄 Thème de Noël - Supprimer cette ligne après les fêtes */}
          <ChristmasTheme />
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <CookieBanner />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
