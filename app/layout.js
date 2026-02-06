import './globals.css';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import PushNotificationBootstrap from './components/PushNotificationBootstrap';
import AppAutoRedirect from './components/AppAutoRedirect';
import MobileTabBar from '@/components/MobileTabBar';

// Importer l'intercepteur pour l'app mobile (s'exécute côté client uniquement)
// IMPORTANT: Charger APRÈS Supabase pour éviter les conflits
if (typeof window !== 'undefined') {
  // Attendre que Supabase soit chargé avant d'intercepter
  setTimeout(() => {
    try {
      require('../lib/fetch-interceptor');
    } catch (e) {
      console.warn('Intercepteur fetch non chargé:', e);
    }
  }, 0);
}

// IMPORTANT:
// On n'utilise pas next/font/google ici, car ça déclenche des téléchargements au build
// et peut bloquer (surtout en BUILD_MOBILE/export statique). On reste sur polices système.

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
        {/* Intercepteur fetch pour Capacitor - DOIT être chargé en premier */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window === 'undefined' || !window.location) return;
                  var isCapacitor = window.location.protocol === 'capacitor:' || window.location.href.indexOf('capacitor://') === 0;
                  if (!isCapacitor) return;

                  // Verrouillage ultra-tôt (avant hydration React):
                  // si un rôle livreur est en cache, on force /delivery/dashboard.
                  try {
                    var cached = localStorage.getItem('cvneat-role-cache');
                    var cachedRole = '';
                    if (cached) {
                      try { cachedRole = (JSON.parse(cached).role || '').toString().trim().toLowerCase(); } catch (e0) {}
                    }
                    var pathNow = window.location && window.location.pathname ? window.location.pathname : '';
                    if ((cachedRole === 'delivery' || cachedRole === 'livreur') && pathNow && pathNow !== '/delivery/dashboard') {
                      window.location.replace('/delivery/dashboard');
                      return;
                    }
                  } catch (e0) {
                    // ignore
                  }
                  // IMPORTANT: cvneat.fr redirige (307) vers www.cvneat.fr.
                  // Dans WKWebView (Capacitor), éviter les redirects améliore fortement la fiabilité des appels fetch.
                  var API_BASE_URL = 'https://www.cvneat.fr';
                  var originalFetch = window.fetch;
                  var DEBUG = false;
                  window.fetch = function(input, init) {
                    if (typeof input === 'string' && input.indexOf('/api/') === 0 && input.indexOf('http') !== 0) {
                      var fullUrl = API_BASE_URL + input;
                      if (DEBUG) console.log('[API Interceptor] Interception:', input, '→', fullUrl);
                      var opts = init || {};
                      var headers = opts.headers || {};
                      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
                      headers['Accept'] = headers['Accept'] || 'application/json';
                      opts.headers = headers;
                      // IMPORTANT (Capacitor/WKWebView):
                      // On n'utilise PAS les cookies pour l'API (on utilise Authorization).
                      // Avec credentials=include et Access-Control-Allow-Origin="*", WKWebView peut échouer ("Load failed").
                      opts.mode = 'cors';
                      opts.credentials = 'omit';
                      return originalFetch(fullUrl, opts).then(function(r) {
                        if (DEBUG) console.log('[API Interceptor] Réponse:', r.status, fullUrl);
                        return r;
                      }).catch(function(e) {
                        console.error('[API Interceptor] Erreur:', e.message);
                        throw e;
                      });
                    }
                    return originalFetch(input, init);
                  };
                  if (DEBUG) console.log('[API Interceptor] Fetch intercepté !');
                  
                  // Gestionnaire de liens pour empêcher l'ouverture du navigateur
                  document.addEventListener('DOMContentLoaded', function() {
                    if (DEBUG) console.log('[Link Handler] Initialisation gestionnaire de liens');
                    
                    // Intercepter les clics sur les liens
                    document.addEventListener('click', function(event) {
                      var target = event.target;
                      var link = target.closest('a');
                      
                      if (!link) return;
                      
                      var href = link.getAttribute('href');
                      if (!href || href === '#' || href.startsWith('javascript:')) return;
                      
                      // Si c'est un lien externe vers cvneat.fr, naviguer dans l'app
                      if (href.startsWith('http://') || href.startsWith('https://')) {
                        if (href.includes('cvneat.fr')) {
                          event.preventDefault();
                          event.stopPropagation();
                          try {
                            var url = new URL(href);
                            var path = url.pathname + url.search + url.hash;
                            if (DEBUG) console.log('[Link Handler] Navigation interne:', path);
                            // Éviter un reload complet (plus lent) : utiliser l'history API
                            try {
                              window.history.pushState({}, '', path);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            } catch (e2) {
                              window.location.href = path;
                            }
                          } catch (e) {
                            if (DEBUG) console.error('[Link Handler] Erreur:', e);
                          }
                          return;
                        }
                        // Bloquer les autres liens externes
                        if (DEBUG) console.log('[Link Handler] Lien externe bloqué:', href);
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }
                      
                      // Empêcher target="_blank"
                      if (link.target === '_blank') {
                        // Pour les liens internes, laisser Next.js gérer (évite un rechargement complet qui renvoie parfois à l’accueil)
                        if (href.startsWith('/')) {
                          link.target = '';
                          return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        if (DEBUG) console.log('[Link Handler] Lien _blank bloqué/converti:', href);
                        try {
                          window.history.pushState({}, '', href);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        } catch (e3) {
                          window.location.href = href;
                        }
                      }

                      // IMPORTANT: Ne PAS forcer la navigation des liens internes ("/...") avec window.location.href.
                      // Sinon on casse le routing Next.js et, en mode assets locaux Capacitor, certaines routes retombent sur / (accueil).
                    }, true);
                    
                    // Intercepter window.open
                    var originalOpen = window.open;
                    window.open = function(url, target, features) {
                      if (DEBUG) console.log('[Link Handler] window.open intercepté:', url);
                      if (url && (url.includes('cvneat.fr') || url.startsWith('/'))) {
                        var path = url.startsWith('http') ? new URL(url).pathname : url;
                        try {
                          window.history.pushState({}, '', path);
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        } catch (e4) {
                          window.location.href = path;
                        }
                        return null;
                      }
                      if (DEBUG) console.log('[Link Handler] window.open bloqué:', url);
                      return null;
                    };
                  });
                } catch (e) {
                  console.error('[API Interceptor] Erreur chargement:', e);
                }
              })();
            `
          }}
        />
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
      <body className="font-sans transition-colors duration-300">
        <ThemeProvider>
          {/* Init push natif (APNs/FCM) via Capacitor - sans UI */}
          <PushNotificationBootstrap />
          {/* Auto-redirect app mobile si déjà connecté (livreur/restaurant) */}
          <AppAutoRedirect />
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <MobileTabBar />
            <Footer />
            <CookieBanner />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
