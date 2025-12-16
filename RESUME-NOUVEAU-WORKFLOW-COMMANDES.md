# Résumé : Nouveau Workflow d'Acceptation de Commandes

## ✅ Système Actif

Le nouveau workflow est maintenant **complètement opérationnel** après l'exécution de la migration SQL.

## 📋 Workflow Complet

### 1. **Client passe commande**
   - Commande créée avec statut `en_attente`
   - `livreur_id = NULL`
   - `delivery_requested_at = NOW()` (pour expiration automatique)

### 2. **Livreur voit et accepte** (AVANT le restaurant)
   - Les livreurs voient les commandes `en_attente` dans `/api/delivery/available-orders`
   - Un livreur accepte → `livreur_id` est assigné
   - Statut reste `en_attente`
   - **Le restaurant N'EST PAS encore notifié**

### 3. **Restaurant reçoit notification** (APRÈS acceptation livreur)
   - Notification automatique quand `livreur_id` passe de NULL à non-NULL
   - Message : "Nouvelle commande (Livreur assigné) !"
   - Le restaurant peut voir la commande dans son dashboard

### 4. **Restaurant accepte**
   - Le restaurant accepte → statut passe à `en_preparation`
   - La préparation commence
   - Le livreur peut suivre l'avancement

### 5. **Expiration automatique** (si aucun livreur)
   - Si aucun livreur n'accepte dans **10 minutes**
   - Commande automatiquement annulée (statut → `annulee`)
   - Le restaurant n'est jamais notifié

## 🔧 Configuration Requise

### Migration SQL ✅ (FAIT)
- Colonne `delivery_requested_at` ajoutée
- Fonction `cleanup_expired_orders()` créée
- Index de performance créé

### Nettoyage Automatique (Optionnel mais Recommandé)

Pour activer le nettoyage automatique toutes les minutes, configurez :

**Option 1 : Vercel Cron** (si déployé sur Vercel)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/admin/cleanup-expired-orders",
    "schedule": "* * * * *"
  }]
}
```

**Option 2 : Cron externe**
```bash
*/1 * * * * curl -X POST https://cvneat.fr/api/admin/cleanup-expired-orders -H "Authorization: Bearer YOUR_CLEANUP_API_KEY"
```

## 📊 Avantages

1. ✅ **Pas de préparation inutile** : Le restaurant ne prépare que si un livreur est disponible
2. ✅ **Moins de remboursements** : Pas de commandes livrées sans livreur
3. ✅ **Expiration automatique** : Commandes sans livreur annulées après 10 minutes
4. ✅ **Workflow logique** : Livreur → Restaurant (ordre naturel)

## 🔍 Points de Vérification

- [x] Migration SQL exécutée
- [x] APIs modifiées (delivery/available-orders, delivery/accept-order, partner/orders)
- [x] Notifications restaurant modifiées (RealTimeNotifications, RestaurantOrderAlert)
- [x] Filtres par `livreur_id IS NOT NULL` ajoutés
- [ ] Nettoyage automatique configuré (optionnel)

## 🧪 Test du Système

1. Créez une commande test
2. Vérifiez qu'elle apparaît dans le dashboard livreur (statut `en_attente`)
3. Un livreur accepte → Vérifiez que le restaurant reçoit la notification
4. Restaurant accepte → Statut passe à `en_preparation`
5. Test expiration : Créez une commande et attendez 10 minutes sans livreur → Doit être annulée

## 📝 Fichiers Modifiés

- `app/api/delivery/available-orders/route.js`
- `app/api/delivery/accept-order/[orderId]/route.js`
- `app/api/partner/orders/route.js`
- `app/components/RealTimeNotifications.js`
- `components/RestaurantOrderAlert.js`
- `app/api/partner/notifications/sse/route.js`
- `app/api/orders/route.js` (ajout `delivery_requested_at`)
- `supabase/migrations/20250123000000_add_delivery_expiration_to_orders.sql`
- `app/api/admin/cleanup-expired-orders/route.js` (nouveau)

---

**Système opérationnel depuis :** 2025-01-23
**Délai d'expiration :** 10 minutes
**Statut :** ✅ ACTIF

