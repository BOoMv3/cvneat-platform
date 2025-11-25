/**
 * Configuration Firebase pour les notifications push natives
 * Ce fichier est utilisé UNIQUEMENT par l'app mobile Capacitor
 * Il n'impacte pas le site web
 */

// Configuration Firebase - À remplir avec vos credentials Firebase
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Vérifier si Firebase est configuré
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && firebaseConfig.projectId;
};

