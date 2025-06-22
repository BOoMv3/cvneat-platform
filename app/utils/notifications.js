import { safeLocalStorage } from "../../lib/localStorage";

// Fonction pour envoyer une notification push
export const sendPushNotification = (title, body, options = {}) => {
  if (!('Notification' in window)) {
    console.log('Notifications non supportées');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'cvneat-order',
      requireInteraction: false,
      ...options
    });

    // Fermer automatiquement après 5 secondes
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }
};

// Fonction pour envoyer une notification de changement de statut
export const sendOrderStatusNotification = (orderId, status, orderDetails = {}) => {
  const statusMessages = {
    'accepted': {
      title: 'CVN\'Eat - Commande acceptée ! 🎉',
      body: `Votre commande #${orderId} a été acceptée et sera préparée bientôt.`
    },
    'preparing': {
      title: 'CVN\'Eat - En préparation 👨‍🍳',
      body: `Votre commande #${orderId} est en cours de préparation.`
    },
    'ready': {
      title: 'CVN\'Eat - Commande prête ! 📦',
      body: `Votre commande #${orderId} est prête et sera livrée bientôt.`
    },
    'delivered': {
      title: 'CVN\'Eat - Commande livrée ! 🚚',
      body: `Votre commande #${orderId} a été livrée. Bon appétit !`
    },
    'rejected': {
      title: 'CVN\'Eat - Commande refusée ❌',
      body: `Votre commande #${orderId} a été refusée. Veuillez contacter le restaurant.`
    }
  };

  const message = statusMessages[status];
  if (message) {
    return sendPushNotification(message.title, message.body, {
      tag: `order-${orderId}-${status}`,
      data: {
        orderId,
        status,
        restaurantName: orderDetails.restaurant_name,
        totalAmount: orderDetails.total_amount
      }
    });
  }
};

// Fonction pour demander la permission
export async function requestNotificationPermission(orderId) {
  if (!('Notification' in window)) {
    alert("Ce navigateur ne supporte pas les notifications desktop");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    new Notification("Notifications activées !", {
      body: "Vous serez notifié du statut de votre commande.",
      icon: '/logo.png'
    });
    
    safeLocalStorage.setItem('cvneat_notifications_enabled', 'true');
    safeLocalStorage.setItem('cvneat_notification_order_id', orderId);
    
    // Envoyer le token au serveur
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

// Fonction pour vérifier si les notifications sont activées
export const isNotificationEnabled = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

// Fonction pour enregistrer les préférences de notification
export const saveNotificationPreferences = (orderId, enabled = true) => {
  if (enabled) {
    safeLocalStorage.setItem('cvneat_notifications_enabled', 'true');
    safeLocalStorage.setItem('cvneat_notification_order_id', orderId);
  } else {
    safeLocalStorage.removeItem('cvneat_notifications_enabled');
    safeLocalStorage.removeItem('cvneat_notification_order_id');
  }
};

// Fonction pour récupérer les préférences de notification
export function getNotificationStatus() {
  return {
    supported: 'Notification' in window,
    permission: Notification.permission,
    enabled: safeLocalStorage.getItem('cvneat_notifications_enabled') === 'true',
    orderId: safeLocalStorage.getItem('cvneat_notification_order_id')
  };
}

export function disableNotifications() {
  safeLocalStorage.removeItem('cvneat_notifications_enabled');
  safeLocalStorage.removeItem('cvneat_notification_order_id');
  console.log("Notifications désactivées.");
} 