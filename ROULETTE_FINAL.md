# 🎰 Système Roue de la Chance - Version Finale

## ✅ Modifications apportées

### 1. **Boisson offerte = Item livré (pas de réduction)**
- ✅ Le client gagne une **boisson physique** qui sera livrée avec sa commande
- ✅ Aucun code promo nécessaire
- ✅ La boisson est automatiquement ajoutée lors de la prochaine commande
- ✅ Le système cherche une boisson standard du restaurant (catégorie "Boissons" ou nom contenant "boisson", "coca", "soda")
- ✅ La boisson est ajoutée avec `prix_unitaire: 0` (gratuite)

### 2. **Page "Mes gains" dans le profil**
- ✅ Nouvel onglet "Mes gains" dans `/profile`
- ✅ Affiche tous les gains actifs (non utilisés et non expirés)
- ✅ Pour chaque gain :
  - Code promo (si applicable)
  - Description du gain
  - Date d'expiration
  - Statut (Actif / Utilisé / Expiré)
  - Instructions d'utilisation
- ✅ Pour "boisson offerte" : message spécial indiquant qu'aucun code n'est nécessaire

### 3. **Persistance en base de données**
- ✅ Table `wheel_wins` créée pour stocker tous les gains
- ✅ Chaque gain est sauvegardé avec :
  - `user_id` : Qui a gagné
  - `order_id` : Commande qui a déclenché la roue
  - `prize_type` : Type de gain (discount, free_delivery, free_drink, surprise)
  - `prize_value` : Valeur du gain (si applicable)
  - `promo_code_id` : ID du code promo (si applicable)
  - `promo_code` : Code promo (si applicable)
  - `description` : Description du gain
  - `valid_until` : Date d'expiration
  - `used_at` : Date d'utilisation (null si non utilisé)
  - `used_in_order_id` : Commande où utilisé (null si non utilisé)

### 4. **Expérience utilisateur améliorée**
- ✅ Après avoir tourné la roue, le client voit son gain
- ✅ Message spécial pour "boisson offerte" : "Une boisson vous sera automatiquement ajoutée"
- ✅ Lien vers "Mes gains" pour voir tous les codes actifs
- ✅ Le client peut revenir 2-3 jours après et voir ses gains dans son profil

---

## 📋 À faire dans Supabase

### 1. **Appliquer la migration SQL**

Exécute cette migration dans Supabase SQL Editor :

```sql
-- Table pour stocker les gains de la roue de la chance
CREATE TABLE IF NOT EXISTS wheel_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  prize_type VARCHAR(50) NOT NULL, -- 'discount', 'free_delivery', 'free_drink', 'surprise'
  prize_value DECIMAL(10,2), -- Pour les réductions
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  promo_code VARCHAR(50), -- Code généré (ex: ROULETTEABC123)
  description TEXT, -- Description du gain
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE, -- Quand le code a été utilisé
  used_in_order_id UUID REFERENCES commandes(id) ON DELETE SET NULL, -- Commande où utilisé
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_wheel_wins_user ON wheel_wins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_wins_valid ON wheel_wins(valid_until, used_at);
CREATE INDEX IF NOT EXISTS idx_wheel_wins_code ON wheel_wins(promo_code);

-- Commentaire
COMMENT ON TABLE wheel_wins IS 'Gains de la roue de la chance - Permet au client de voir ses codes actifs';
```

**OU** applique directement le fichier :
`supabase/migrations/20250109000002_create_wheel_wins_table.sql`

### 2. **Vérifier les permissions RLS (si RLS est activé)**

Si tu as activé RLS sur `wheel_wins`, ajoute ces politiques :

```sql
-- Les utilisateurs peuvent voir leurs propres gains
CREATE POLICY "Users can view their own wheel wins"
ON wheel_wins FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs ne peuvent pas modifier leurs gains (seul le système le fait)
-- Pas de politique UPDATE/DELETE pour les utilisateurs
```

---

## 🔍 Comment ça fonctionne maintenant

### **Scénario 1 : Client gagne "Boisson offerte"**

1. Client passe une commande → Paiement validé → Roue apparaît
2. Client tourne la roue → Gagne "Boisson offerte"
3. **Gain sauvegardé dans `wheel_wins`** avec `prize_type = 'free_drink'`
4. Message affiché : "Une boisson vous sera automatiquement ajoutée à votre prochaine commande"
5. Client peut voir son gain dans "Mes gains" (profil)
6. **Lors de la prochaine commande** :
   - Le système détecte le gain actif
   - Cherche une boisson standard du restaurant
   - Ajoute la boisson avec `prix_unitaire = 0`
   - Marque le gain comme utilisé (`used_at = NOW()`)

### **Scénario 2 : Client gagne un code promo (-10%, livraison offerte, etc.)**

1. Client passe une commande → Paiement validé → Roue apparaît
2. Client tourne la roue → Gagne un code (ex: "Livraison offerte")
3. **Code promo créé dans `promo_codes`** (ex: `ROULETTEABC123`)
4. **Gain sauvegardé dans `wheel_wins`** avec `promo_code_id` et `promo_code`
5. Message affiché : "Votre code promo : ROULETTEABC123"
6. Client peut voir son code dans "Mes gains" (profil)
7. **Lors de la prochaine commande** :
   - Client entre le code au checkout
   - Code validé et appliqué
   - Code marqué comme utilisé dans `promo_code_usage`
   - Gain marqué comme utilisé dans `wheel_wins` (`used_at = NOW()`)

---

## 📊 Requêtes SQL utiles

### Voir tous les gains actifs d'un client
```sql
SELECT 
  ww.*,
  pc.code as promo_code_value,
  pc.description as promo_description
FROM wheel_wins ww
LEFT JOIN promo_codes pc ON pc.id = ww.promo_code_id
WHERE ww.user_id = 'USER_ID_ICI'
  AND ww.used_at IS NULL
  AND ww.valid_until > NOW()
ORDER BY ww.created_at DESC;
```

### Voir les boissons offertes utilisées
```sql
SELECT 
  ww.id,
  u.email as client_email,
  c.id as commande_id,
  c.total as montant_commande,
  ww.used_at as date_utilisation
FROM wheel_wins ww
JOIN users u ON u.id = ww.user_id
JOIN commandes c ON c.id = ww.used_in_order_id
WHERE ww.prize_type = 'free_drink'
  AND ww.used_at IS NOT NULL
ORDER BY ww.used_at DESC;
```

### Statistiques des gains
```sql
SELECT 
  prize_type,
  COUNT(*) as total_gains,
  COUNT(CASE WHEN used_at IS NULL AND valid_until > NOW() THEN 1 END) as actifs,
  COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as utilises,
  COUNT(CASE WHEN used_at IS NULL AND valid_until < NOW() THEN 1 END) as expires
FROM wheel_wins
GROUP BY prize_type;
```

---

## ✅ Checklist de déploiement

- [x] Code modifié et pushé
- [ ] Migration SQL appliquée dans Supabase
- [ ] Vérifier que la table `wheel_wins` existe
- [ ] Tester : Passer une commande → Tourner la roue → Vérifier dans "Mes gains"
- [ ] Tester : Utiliser un code promo au checkout
- [ ] Tester : Passer une commande avec gain "boisson offerte" actif → Vérifier que la boisson est ajoutée

---

## 🎉 Résultat final

- ✅ **Boisson offerte** = Item livré (pas de réduction)
- ✅ **Page "Mes gains"** = Le client voit tous ses codes actifs
- ✅ **Persistance BDD** = Les gains sont sauvegardés et visibles même après déconnexion
- ✅ **Expérience claire** = Le client comprend comment utiliser ses gains

