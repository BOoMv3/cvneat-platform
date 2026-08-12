import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.cvneat.app',
  appName: "CVN'EAT",
  webDir: 'out',
  bundledWebRuntime: false,
  // Sunmi / Android partenaires : charger le site live (évite APK bloqué sur un vieux export `out/`)
  // Les plugins natifs (SunmiPrint, push) restent disponibles.
  server: {
    url: 'https://www.cvneat.fr',
    cleartext: false,
    allowNavigation: ['cvneat.fr', 'www.cvneat.fr', '*.cvneat.fr'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ea580c'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    // Permettre les cookies et sessions
    allowsLinkPreview: true,
    limitsNavigationsToAppBoundDomains: false,
    // Permettre toutes les navigations
    allowsBackForwardNavigationGestures: true,
    // Empêcher l'ouverture du navigateur externe
    handleUrlOpen: true
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;

