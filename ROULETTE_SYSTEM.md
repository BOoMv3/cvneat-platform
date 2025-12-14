# 🎰 Système Roue de la Chance - Guide Complet

## ✅ Ce qui fonctionne maintenant

### 1. **Roue 100% gagnante** (4 options)
- ✅ Livraison offerte (valable avant le 24 décembre)
- ✅ Boisson offerte (3€ de réduction)
- ✅ -10% sur la commande
- ✅ Surprise (2€, 3€ ou 5% aléatoire)

### 2. **Génération automatique de codes**
- ✅ Codes uniques : `ROULETTEXXXXXX`
- ✅ Expiration : 1 semaine (sauf livraison = avant 24 déc)
- ✅ 1 seule utilisation par compte

### 3. **Application des codes au checkout**
- ✅ Champ code promo ajouté
- ✅ Calcul automatique du total avec réduction
- ✅ Livraison gratuite appliquée si code `free_delivery`
- ✅ Réduction en pourcentage ou fixe appliquée

---

## 📋 Vérifications à faire dans Supabase

### ✅ **Aucune migration nécessaire !**

Le système utilise déjà les tables existantes :
- `promo_codes` (déjà créée)
- `promo_code_usage` (déjà créée)
- Fonction `validate_promo_code` (déjà créée)
- Fonction `increment_promo_code_uses` (déjà créée)

**Tout est prêt !** 🎉

---

## 🔍 Comment vérifier que tout fonctionne

### 1. **Test de la roue**
1. Passe une commande test
2. Après paiement → La roue apparaît
3. Tourne la roue → Un code est généré (ex: `ROULETTEABC123`)
4. Note le code

### 2. **Test du code promo**
1. Va au checkout d'une nouvelle commande
2. Entre le code généré
3. Vérifie que :
   - ✅ Le total se recalcule avec la réduction
   - ✅ Si "livraison offerte" → Frais de livraison = 0€
   - ✅ Si "-10%" → Réduction de 10% sur le sous-total
   - ✅ Si "boisson offerte" → Réduction de 3€
   - ✅ Si "surprise" → Réduction de 2€, 3€ ou 5%

### 3. **Vérifier dans Supabase**
```sql
-- Voir les codes générés
SELECT code, description, discount_type, discount_value, valid_until, current_uses
FROM promo_codes
WHERE code LIKE 'ROULETTE%'
ORDER BY created_at DESC;

-- Voir les utilisations
SELECT 
  pc.code,
  pc.description,
  pcu.user_id,
  pcu.order_id,
  pcu.discount_amount,
  pcu.used_at
FROM promo_code_usage pcu
JOIN promo_codes pc ON pc.id = pcu.promo_code_id
WHERE pc.code LIKE 'ROULETTE%'
ORDER BY pcu.used_at DESC;
```

---

## 💰 Calculs des prix

### Exemple 1 : Code "-10%"
- Panier : 30€
- Livraison : 2.50€
- Frais plateforme : 0.49€
- **Réduction** : 30€ × 10% = 3€
- **Sous-total après réduction** : 30€ - 3€ = 27€
- **Total** : 27€ + 2.50€ + 0.49€ = **29.99€**

### Exemple 2 : Code "Livraison offerte"
- Panier : 30€
- Livraison : ~~2.50€~~ → **0€** (gratuite)
- Frais plateforme : 0.49€
- **Total** : 30€ + 0€ + 0.49€ = **30.49€**

### Exemple 3 : Code "Boisson offerte" (3€)
- Panier : 30€
- Livraison : 2.50€
- Frais plateforme : 0.49€
- **Réduction** : 3€
- **Sous-total après réduction** : 30€ - 3€ = 27€
- **Total** : 27€ + 2.50€ + 0.49€ = **29.99€**

---

## 📊 Suivi des codes utilisés

### Dans le dashboard admin
Les codes utilisés sont visibles dans :
- Table `promo_code_usage` → Qui a utilisé quel code
- Table `promo_codes` → `current_uses` = nombre d'utilisations

### Pour voir les codes "boisson offerte" utilisés
```sql
SELECT 
  pc.code,
  u.email as client_email,
  c.id as commande_id,
  c.total as montant_commande,
  pcu.discount_amount as reduction_appliquee,
  pcu.used_at as date_utilisation
FROM promo_code_usage pcu
JOIN promo_codes pc ON pc.id = pcu.promo_code_id
JOIN commandes c ON c.id = pcu.order_id
LEFT JOIN users u ON u.id = pcu.user_id
WHERE pc.description LIKE '%Boisson offerte%'
ORDER BY pcu.used_at DESC;
```

---

## ⚠️ Points d'attention

### 1. **Boisson offerte = réduction fixe de 3€**
- Le client reçoit 3€ de réduction
- Il peut l'utiliser comme il veut (pas forcément sur une boisson)
- **Tu n'es pas notifié automatiquement** - Vérifie dans Supabase si besoin

### 2. **Livraison offerte avant le 24**
- Les codes générés avant le 24 expirent le 23 décembre 23h59
- Après le 24, les nouveaux codes "livraison offerte" auront 1 semaine

### 3. **1 seule utilisation par compte**
- Le système vérifie automatiquement via `max_uses_per_user = 1`
- Si un client réessaie, il verra "Vous avez déjà utilisé ce code promo"

---

## 🚀 Déploiement

**Tout est déjà pushé !** ✅

Dans ~2-3 minutes (déploiement Vercel), le système sera actif.

---

## 🐛 En cas de problème

### Le code ne s'applique pas ?
1. Vérifie que le code existe : `SELECT * FROM promo_codes WHERE code = 'ROULETTEXXX'`
2. Vérifie qu'il n'est pas expiré : `valid_until > NOW()`
3. Vérifie qu'il n'a pas déjà été utilisé : `current_uses < max_uses`

### Le total ne se recalcule pas ?
1. Vérifie la console du navigateur (F12)
2. Vérifie que `appliedPromoCode` est bien défini
3. Force un refresh de la page

---

## 📝 Notes importantes

- **Aucune migration SQL nécessaire** - Tout utilise les tables existantes
- **Les codes sont générés automatiquement** - Pas besoin de les créer manuellement
- **Le système vérifie automatiquement** les limites (1 utilisation, expiration, etc.)
- **Les calculs sont corrects** - Le total inclut toujours la réduction et la livraison (gratuite si code)

