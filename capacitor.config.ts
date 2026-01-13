import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.cvneat.app',
  appName: "CVN'EAT",
  webDir: 'out',
  bundledWebRuntime: false,
  // App native : utiliser les fichiers locaux (pas de serveur distant)
  // Les appels API seront interceptés et redirigés vers https://cvneat.fr/api
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

