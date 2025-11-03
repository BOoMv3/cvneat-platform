// Système de broadcasting SSE simple en mémoire
// Stocke les clients SSE connectés et permet d'envoyer des messages à tous

class SSEBroadcaster {
  constructor() {
    this.clients = new Map(); // Map<restaurantId, Set<controller>>
  }

  // Ajouter un client SSE
  addClient(restaurantId, controller) {
    if (!this.clients.has(restaurantId)) {
      this.clients.set(restaurantId, new Set());
    }
    this.clients.get(restaurantId).add(controller);
    console.log(`📡 Client SSE ajouté pour restaurant ${restaurantId}, total: ${this.clients.get(restaurantId).size}`);
    
    // Retourner une fonction pour supprimer le client
    return () => {
      this.removeClient(restaurantId, controller);
    };
  }

  // Supprimer un client SSE
  removeClient(restaurantId, controller) {
    if (this.clients.has(restaurantId)) {
      this.clients.get(restaurantId).delete(controller);
      if (this.clients.get(restaurantId).size === 0) {
        this.clients.delete(restaurantId);
      }
      console.log(`📡 Client SSE supprimé pour restaurant ${restaurantId}, restants: ${this.clients.get(restaurantId)?.size || 0}`);
    }
  }

  // Envoyer une notification à tous les clients d'un restaurant
  broadcast(restaurantId, data) {
    if (!this.clients.has(restaurantId)) {
      console.warn(`⚠️ Aucun client SSE pour restaurant ${restaurantId}`);
      return false;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    let sentCount = 0;

    this.clients.get(restaurantId).forEach(controller => {
      try {
        controller.enqueue(encoder.encode(message));
        sentCount++;
      } catch (error) {
        console.error('❌ Erreur envoi message SSE:', error);
        // Supprimer le client en erreur
        this.clients.get(restaurantId).delete(controller);
      }
    });

    console.log(`✅ Message broadcast envoyé à ${sentCount} client(s) pour restaurant ${restaurantId}`);
    return sentCount > 0;
  }

  // Obtenir le nombre de clients connectés pour un restaurant
  getClientCount(restaurantId) {
    return this.clients.get(restaurantId)?.size || 0;
  }
}

// Instance singleton
const sseBroadcaster = new SSEBroadcaster();

export default sseBroadcaster;

