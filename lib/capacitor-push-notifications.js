/**
 * Service de notifications push natives pour Capacitor
 * Fonctionne UNIQUEMENT dans l'app mobile (pas sur le site web)
 * N'impacte pas le fonctionnement du site web
 */

// Détection si on est dans une app Capacitor native
export const isNativeApp = () => {
  if (typeof window === 'undefined') return false;
  // Capacitor v7 expose isNativePlatform(), mais on garde des fallbacks sûrs
  const isNative = window.Capacitor?.isNativePlatform?.() || false;
  const isCapacitorScheme =
    window.location?.protocol === 'capacitor:' ||
    window.location?.href?.startsWith('capacitor://');
  return isNative || isCapacitorScheme || !!window.Capacitor;
};

// Initialisation des push notifications (appelé uniquement dans l'app native)
export const initPushNotifications = async () => {
  // Ne rien faire si on n'est pas dans l'app native
  if (!isNativeApp()) {
    console.log('Push notifications natives: Non disponible (site web)');
    return null;
  }

  try {
    // Import dynamique pour éviter les erreurs sur le site web
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Vérifier les permissions
    let permStatus = await PushNotifications.checkPermissions();
    console.log('🔔 Push checkPermissions:', permStatus);

    if (permStatus.receive !== 'granted') {
      const newStatus = await PushNotifications.requestPermissions();
      permStatus = newStatus;
      console.log('🔔 Push requestPermissions:', permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.log('Permissions push non accordées (ou refusées)');
      return null;
    }

    // Enregistrer pour les notifications push
    await PushNotifications.register();

    // Écouter les événements
    PushNotifications.addListener('registration', (token) => {
      console.log('Token push reçu:', token.value);
      // Envoyer le token au serveur pour l'associer à l'utilisateur
      saveTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Erreur enregistrement push:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification reçue:', notification);
      // La notification est affichée automatiquement par le système
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Action sur notification:', action);
      // Gérer le clic sur la notification
      handleNotificationClick(action.notification);
    });

    console.log('Push notifications natives initialisées');

    // Si le token a été reçu avant login, on le rattache au user dès qu'une session existe
    try {
      const { supabase } = await import('@/lib/supabase');
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.access_token) return;
        let storedToken = null;
        try {
          storedToken = localStorage.getItem('native-push-token');
        } catch (e) {
          // ignore
        }
        if (storedToken) {
          console.log('🔄 Réassociation token push après login...');
          await saveTokenToServer(storedToken);
        }
      });
    } catch (e) {
      // ignore
    }
    return true;

  } catch (error) {
    console.error('Erreur init push notifications:', error);
    return null;
  }
};

// Sauvegarder le token push (FCM pour Android, APNs pour iOS) sur le serveur
const saveTokenToServer = async (token) => {
  try {
    const platform = getPlatform();
    console.log(`📱 Enregistrement token ${platform}:`, token.substring(0, 20) + '...');

    // Associer le token au bon user_id (sinon impossible d'envoyer un push ciblé par rôle)
    let accessToken = null;
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getSession();
      accessToken = data?.session?.access_token || null;
    } catch (e) {
      // ignore
    }

    // Toujours garder une copie locale du token (utile si reçu avant login)
    try {
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('native-push-token', token);
      }
    } catch (e) {
      // ignore
    }

    if (!accessToken) {
      console.log('ℹ️ Pas de session Supabase: enregistrement token reporté.');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/notifications/register-device', {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        token,
        platform: platform
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erreur sauvegarde token:', errorData.error || 'Erreur inconnue');
    } else {
      console.log('✅ Token enregistré avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur envoi token:', error);
  }
};

// Obtenir la plateforme (android/ios)
const getPlatform = () => {
  if (typeof window === 'undefined') return 'web';
  return window.Capacitor?.getPlatform?.() || 'web';
};

// Gérer le clic sur une notification
const handleNotificationClick = (notification) => {
  const data = notification.data || {};
  
  // Rediriger selon le type de notification
  if (data.orderId) {
    // Notification de commande
    if (data.type === 'new_order') {
      window.location.href = `/restaurant/orders`;
    } else if (data.type === 'delivery_available') {
      window.location.href = `/delivery/dashboard`;
    } else {
      window.location.href = `/orders/${data.orderId}`;
    }
  }
};

// Désinscrire des notifications
export const unregisterPushNotifications = async () => {
  if (!isNativeApp()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
    console.log('Push notifications désactivées');
  } catch (error) {
    console.error('Erreur désactivation push:', error);
  }
};

