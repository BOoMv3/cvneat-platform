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
    // Reset badge iOS (évite la bulle "1" fantôme)
    // Utilise @capacitor/badge si disponible (safe: try/catch).
    const clearBadge = async () => {
      try {
        const { Badge } = await import('@capacitor/badge');
        await Badge.set({ count: 0 });
        console.log('🔕 Badge iOS reset à 0');
      } catch {
        // Plugin non installé: ignore
      }
    };
    // Reset au démarrage
    clearBadge();

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

    // Écouter les événements
    // IMPORTANT: ajouter les listeners AVANT register(), sinon on peut rater "registration" sur iOS.
    let sawRegistration = false;
    PushNotifications.addListener('registration', (token) => {
      sawRegistration = true;
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
      // Dès qu'on est dans l'app, on peut remettre le badge à 0
      clearBadge();
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Action sur notification:', action);
      // Gérer le clic sur la notification
      handleNotificationClick(action.notification);
      // Après ouverture, remettre le badge à 0
      clearBadge();
    });

    // Enregistrer pour les notifications push
    await PushNotifications.register();

    console.log('Push notifications natives initialisées');

    // Diagnostic: si aucun token après quelques secondes, on log (pour debug iOS)
    setTimeout(() => {
      if (!sawRegistration) {
        console.warn('⚠️ Push register appelé mais aucun événement "registration" reçu (token manquant). Vérifier APNs/entitlements/provisioning.');
      }
    }, 6000);

    // Si le token a été reçu avant login, on le rattache au user dès qu'une session existe
    // + On tente aussi immédiatement (cas fréquent: token déjà stocké + user déjà loggé)
    try {
      const { supabase } = await import('@/lib/supabase');

      const tryReassociateNow = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const session = data?.session;
          if (!session?.access_token) return;
          let storedToken = null;
          try {
            storedToken = localStorage.getItem('native-push-token');
          } catch (e) {
            // ignore
          }
          if (storedToken) {
            console.log('🔄 Réassociation token push (startup) ...');
            await saveTokenToServer(storedToken);
          }
        } catch (e) {
          // ignore
        }
      };

      // Tentative immédiate au démarrage
      tryReassociateNow();

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
    let userId = null;
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase.auth.getSession();
      accessToken = data?.session?.access_token || null;
      userId = data?.session?.user?.id || null;
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

    // ✅ Chemin le plus fiable en app mobile (static export):
    // enregistrer DIRECTEMENT dans Supabase via RLS (auth.uid() = user_id)
    // Ça évite de dépendre des routes Next.js /api qui ne sont pas servies localement en export statique.
    try {
      const { supabase } = await import('@/lib/supabase');
      if (userId) {
        const nowIso = new Date().toISOString();
        const { error: upsertError } = await supabase
          .from('device_tokens')
          .upsert(
            {
              token,
              user_id: userId,
              platform,
              updated_at: nowIso,
              created_at: nowIso,
            },
            { onConflict: 'token' }
          );

        if (!upsertError) {
          console.log('✅ Token enregistré dans Supabase (direct RLS)');
          try {
            localStorage.removeItem('native-push-token');
          } catch (e) {
            // ignore
          }
          return;
        }

        console.warn('⚠️ Échec enregistrement token (direct Supabase), fallback API:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        });
      } else {
        console.warn('⚠️ Session OK mais userId manquant, fallback API');
      }
    } catch (e) {
      console.warn('⚠️ Erreur enregistrement token (direct Supabase), fallback API:', e?.message || e);
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Fallback API (utile pour centraliser côté serveur si besoin)
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
      const okData = await response.json().catch(() => ({}));
      console.log('✅ Token enregistré via API:', okData);
      // Nettoyer la copie locale si l'association a réussi
      try {
        localStorage.removeItem('native-push-token');
      } catch (e) {
        // ignore
      }
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

