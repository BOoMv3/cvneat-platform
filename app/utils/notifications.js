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
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
};

// Fonction pour vérifier si les notifications sont activées
export const isNotificationEnabled = () => {
  return 'Notification' in window && Notification.permission === 'granted';
};

// Fonction pour enregistrer les préférences de notification
export const saveNotificationPreferences = (orderId, enabled = true) => {
  if (enabled) {
    localStorage.setItem('cvneat_notifications_enabled', 'true');
    localStorage.setItem('cvneat_notification_order_id', orderId);
  } else {
    localStorage.removeItem('cvneat_notifications_enabled');
    localStorage.removeItem('cvneat_notification_order_id');
  }
};

// Fonction pour récupérer les préférences de notification
export const getNotificationPreferences = () => {
  return {
    enabled: localStorage.getItem('cvneat_notifications_enabled') === 'true',
    orderId: localStorage.getItem('cvneat_notification_order_id')
  };
}; 