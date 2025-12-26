# Guide : Comment annuler un remboursement Stripe

## ⚠️ IMPORTANT

**Stripe ne permet d'annuler que les remboursements en statut "pending" (en attente).**

Une fois qu'un remboursement a le statut "succeeded" (réussi), il **ne peut plus être annulé** car les fonds ont déjà été renvoyés au client.

---

## 📋 Procédure étape par étape

### Étape 1 : Trouver l'ID du remboursement Stripe

Vous pouvez trouver l'ID du remboursement de plusieurs façons :

**Option A : Depuis une commande dans la base de données**
```sql
-- Dans Supabase SQL Editor, chercher une commande
SELECT 
  id as order_id,
  stripe_refund_id,
  refund_amount,
  payment_status,
  statut
FROM commandes
WHERE id = 'VOTRE_ORDER_ID';
```

**Option B : Depuis le dashboard Stripe**
- Allez sur https://dashboard.stripe.com
- Ouvrez "Paiements" > "Remboursements"
- Trouvez le remboursement et copiez son ID (commence par `re_`)

**Option C : Depuis l'ID de la commande**
- Utilisez le script avec `--order-id` (voir ci-dessous)

---

### Étape 2 : Vérifier le statut du remboursement

**Avant d'essayer d'annuler**, vérifiez le statut :

```bash
node scripts/verifier-remboursement-stripe.js re_XXXXXXXXXXXXX
```

**Exemple de sortie :**
```
🔍 Vérification du remboursement Stripe: re_1234567890abcdef

📊 Détails du remboursement:
   ID: re_1234567890abcdef
   Montant: 31.09€
   Statut: pending
   Raison: requested_by_customer
   Créé le: 01/01/2024 14:30:00

✅ Ce remboursement peut être annulé (statut: pending)
   Utilisez: node scripts/cancel-stripe-refund.js re_1234567890abcdef
```

---

### Étape 3 : Annuler le remboursement

#### Méthode 1 : Avec l'ID de remboursement Stripe directement

```bash
node scripts/cancel-stripe-refund.js re_XXXXXXXXXXXXX
```

**Si vous avez un token admin spécifique :**
```bash
node scripts/cancel-stripe-refund.js re_XXXXXXXXXXXXX VOTRE_TOKEN_ADMIN
```

#### Méthode 2 : Avec l'ID de la commande

Si vous connaissez seulement l'ID de la commande (pas l'ID de remboursement) :

```bash
node scripts/cancel-stripe-refund.js --order-id VOTRE_ORDER_ID
```

Le script récupérera automatiquement l'ID de remboursement depuis la base de données.

---

### Étape 4 : Vérifier le résultat

Le script affichera un message de succès :

```
✅ Remboursement annulé avec succès
💰 Remboursement:
   id: re_1234567890abcdef
   amount: 31.09€
   status: canceled
```

---

## 🔍 Exemples concrets

### Exemple 1 : Commande avec ID connu

```bash
# 1. Vérifier le statut d'abord
node scripts/verifier-remboursement-stripe.js re_abc123def456

# 2. Si le statut est "pending", annuler
node scripts/cancel-stripe-refund.js re_abc123def456
```

### Exemple 2 : Avec l'ID de commande

```bash
# Le script va chercher automatiquement le stripe_refund_id
node scripts/cancel-stripe-refund.js --order-id 2dd2185c-f55f-47b0-b232-b87d19fb5cdc
```

### Exemple 3 : Via l'API directement (curl)

```bash
# Récupérer votre token admin (depuis votre session admin)
TOKEN_ADMIN="votre_token_ici"

# Annuler le remboursement
curl -X DELETE \
  "http://localhost:3000/api/stripe/refund?refund_id=re_abc123def456" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json"
```

---

## ❌ Que faire si le remboursement est déjà "succeeded" ?

Si le remboursement a déjà le statut "succeeded", vous verrez :

```
❌ Ce remboursement ne peut pas être annulé. Statut actuel: succeeded. 
   Seuls les remboursements en statut "pending" peuvent être annulés.
```

**Dans ce cas :**
1. Le client a déjà reçu les fonds
2. Vous ne pouvez pas annuler automatiquement
3. Options possibles :
   - Contacter le client pour lui demander de refaire un paiement
   - Créer un lien de paiement Stripe pour récupérer le montant
   - Traiter cela manuellement avec le client

---

## 🔐 Token Admin

Le script a besoin d'un token admin. Vous pouvez :

1. **Utiliser une variable d'environnement** : Ajoutez dans `.env.local` :
   ```
   ADMIN_TOKEN=votre_token_ici
   ```

2. **Le passer en argument** :
   ```bash
   node scripts/cancel-stripe-refund.js re_XXXXX VOTRE_TOKEN
   ```

3. **L'obtenir depuis votre session** : Connectez-vous en tant qu'admin dans votre application, ouvrez la console du navigateur, et récupérez le token depuis les cookies ou le localStorage.

---

## 📝 Ce qui se passe dans la base de données

Quand vous annulez un remboursement, le script :

1. ✅ Annule le remboursement dans Stripe
2. ✅ Met à jour la commande dans Supabase :
   - Supprime `stripe_refund_id`
   - Supprime `refund_amount`
   - Supprime `refunded_at`
   - Remet `payment_status` à "paid" (si nécessaire)

La commande redevient "payée" et peut continuer son processus normal.

---

## 🆘 Besoin d'aide ?

Si vous avez des problèmes :

1. Vérifiez que le remboursement est bien en statut "pending"
2. Vérifiez que vous utilisez un token admin valide
3. Vérifiez que `STRIPE_SECRET_KEY` est bien configuré dans `.env.local`
4. Consultez les logs du script pour voir les erreurs détaillées

