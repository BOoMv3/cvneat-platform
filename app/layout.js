import './globals.css';
import { Inter } from 'next/font/google';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '../lib/supabase';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CVN\'Eat - Livraison de repas à domicile',
  description: 'Commandez vos plats préférés et faites-vous livrer à domicile. Restaurants partenaires, livraison rapide et service de qualité.',
  keywords: 'livraison, repas, restaurant, commande, domicile, CVN\'Eat',
  authors: [{ name: 'CVN\'Eat Team' }],
  creator: 'CVN\'Eat',
  publisher: 'CVN\'Eat',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://cvneat.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CVN\'Eat - Livraison de repas à domicile',
    description: 'Commandez vos plats préférés et faites-vous livrer à domicile.',
    url: 'https://cvneat.com',
    siteName: 'CVN\'Eat',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'CVN\'Eat - Livraison de repas',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CVN\'Eat - Livraison de repas à domicile',
    description: 'Commandez vos plats préférés et faites-vous livrer à domicile.',
    images: ['/og-image.jpg'],
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
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  if (typeof window !== 'undefined') {
    window.supabase = supabase;
  }

  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CVN'Eat" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={`${inter.className} transition-colors duration-300`}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <CookieBanner />
          </div>
        </ThemeProvider>
        
        {/* Service Worker Registration - DÉSACTIVÉ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                // Désactiver le Service Worker UNE SEULE FOIS
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                    console.log('Service Worker désactivé:', registration.scope);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
