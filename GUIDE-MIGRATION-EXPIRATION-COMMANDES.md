# Guide : Migration Expiration Automatique des Commandes

## ⚡ Exécution Rapide

1. **Ouvrez Supabase Dashboard** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans "SQL Editor"** (menu de gauche)
4. **Copiez-collez le contenu du fichier** `EXECUTE-MIGRATION-EXPIRATION-COMMANDES.sql`
5. **Cliquez sur "Run"**

## 📋 Ce que fait cette migration

- ✅ Ajoute la colonne `delivery_requested_at` à la table `commandes`
- ✅ Crée la fonction `cleanup_expired_orders()` pour annuler automatiquement les commandes expirées
- ✅ Crée un index pour améliorer les performances
- ✅ Met à jour les commandes existantes

## ⏱️ Expiration automatique

Les commandes en statut `en_attente` sans livreur assigné seront automatiquement annulées après **10 minutes**.

## 🔄 Configuration du nettoyage automatique

Pour que le nettoyage se fasse automatiquement, configurez un cron job qui appelle :

```
POST https://cvneat.fr/api/admin/cleanup-expired-orders
```

**Option 1 : Vercel Cron** (si déployé sur Vercel)

Ajoutez dans `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/admin/cleanup-expired-orders",
    "schedule": "* * * * *"
  }]
}
```

**Option 2 : Cron externe**

```bash
# Exécuter toutes les minutes
*/1 * * * * curl -X POST https://cvneat.fr/api/admin/cleanup-expired-orders -H "Authorization: Bearer YOUR_CLEANUP_API_KEY"
```

## ✅ Vérification

Après l'exécution de la migration, vérifiez que :

1. La colonne `delivery_requested_at` existe dans la table `commandes`
2. La fonction `cleanup_expired_orders()` existe et peut être appelée
3. Les nouvelles commandes ont automatiquement `delivery_requested_at` défini

## 🧪 Test

1. Créez une nouvelle commande
2. Attendez 10 minutes sans qu'un livreur l'accepte
3. La commande devrait être automatiquement annulée (si le cron job est configuré)

