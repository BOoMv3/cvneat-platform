# Installation des colonnes Stripe pour CVN'EAT

## ⚠️ IMPORTANT

Avant de pouvoir utiliser Stripe pour les paiements, vous devez ajouter les colonnes nécessaires dans la table `commandes` de votre base de données Supabase.

## 📋 Étapes d'installation

### 1. Accéder à Supabase SQL Editor

1. Allez sur https://supabase.com
2. Connectez-vous à votre projet
3. Dans le menu de gauche, cliquez sur **"SQL Editor"**

### 2. Exécuter le script SQL

1. Ouvrez le fichier `add-stripe-payment-columns.sql` dans ce projet
2. Copiez tout le contenu du fichier
3. Collez-le dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)

### 3. Vérifier l'installation

Le script ajoutera :
- ✅ La colonne `payment_status` (pending, paid, failed, cancelled, refunded)
- ✅ La colonne `stripe_payment_intent_id` (ID du PaymentIntent Stripe)
- ✅ Les index nécessaires pour les performances

### 4. Vérifier que les colonnes existent

Vous pouvez exécuter cette requête pour vérifier :

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'commandes'
AND column_name IN ('payment_status', 'stripe_payment_intent_id');
```

Vous devriez voir les deux colonnes listées.

## 🔧 Contenu du script

Le script `add-stripe-payment-columns.sql` contient :

```sql
-- Ajouter payment_status
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded'));

-- Ajouter stripe_payment_intent_id
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_commandes_stripe_payment_intent_id 
ON commandes(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_commandes_payment_status 
ON commandes(payment_status);
```

## ✅ Après l'installation

Une fois le script exécuté, vous pourrez :
- ✅ Créer des commandes avec Stripe
- ✅ Suivre le statut des paiements
- ✅ Gérer les remboursements Stripe
- ✅ Recevoir les webhooks Stripe

## 🐛 En cas d'erreur

Si vous voyez l'erreur :
```
"Could not find the 'payment_status' column of 'commandes' in the schema cache"
```

Cela signifie que :
1. Le script n'a pas été exécuté
2. Ou il y a eu une erreur lors de l'exécution

**Solution** : Réexécutez le script SQL dans Supabase.

## 📝 Notes

- Le script utilise `IF NOT EXISTS` donc il est sûr de l'exécuter plusieurs fois
- Les colonnes seront créées même si la table contient déjà des données
- Les valeurs par défaut sont appliquées automatiquement

---

**Date de création** : $(date)
**Version** : 1.0

