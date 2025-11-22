# 🎉 Système de Codes Promo pour Booster les Ventes

## 📋 Vue d'ensemble

Système complet de codes promo pour inciter les clients à commander sur CVN'EAT. Permet de créer des réductions, des offres spéciales et de suivre leur utilisation.

## ✨ Fonctionnalités

### 1. **Types de Réductions**
- **Pourcentage** : Réduction en % (ex: 10%, 15%, 20%)
- **Montant fixe** : Réduction en € (ex: 5€, 10€)
- **Livraison gratuite** : Suppression des frais de livraison

### 2. **Conditions Flexibles**
- Montant minimum de commande
- Limite d'utilisations totales
- Limite d'utilisations par utilisateur
- Dates de validité
- Restriction par restaurant
- Uniquement pour la première commande
- Uniquement pour les nouveaux utilisateurs

### 3. **Codes Promo par Défaut**
- `BIENVENUE10` : 10% de réduction sur la première commande (min 15€)
- `BIENVENUE5` : 5€ de réduction sur la première commande (min 20€)
- `WEEKEND15` : 15% de réduction le weekend (min 25€)
- `FIDELITE20` : 20% de réduction pour les clients fidèles (min 30€)
- `LIVRAISON0` : Livraison gratuite (min 20€)

## 🚀 Installation

### 1. Exécuter les migrations SQL

```sql
-- Dans Supabase SQL Editor
-- 1. Créer les tables et fonctions
-- Exécuter: supabase/migrations/create-promo-codes-system.sql
-- 2. Créer la fonction helper
-- Exécuter: supabase/migrations/create-promo-codes-helper-function.sql
```

### 2. Vérifier les APIs

Les routes API sont déjà créées :
- `POST /api/promo-codes/validate` - Valider un code promo
- `POST /api/promo-codes/apply` - Enregistrer l'utilisation

### 3. Interface Utilisateur

Le composant `PromoCodeInput` est intégré dans le checkout et permet aux clients d'entrer un code promo.

## 📝 Utilisation

### Pour les Clients

1. Aller sur la page de checkout
2. Entrer le code promo dans le champ dédié
3. Cliquer sur "Appliquer"
4. La réduction est automatiquement appliquée au total

### Pour les Administrateurs

#### Créer un nouveau code promo

```sql
INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses,
    max_uses_per_user,
    valid_from,
    valid_until,
    is_active
) VALUES (
    'NOUVEAU10',
    '10% de réduction pour les nouveaux clients',
    'percentage',
    10,
    15.00,
    100, -- 100 utilisations maximum
    1,   -- 1 utilisation par utilisateur
    NOW(),
    NOW() + INTERVAL '30 days',
    TRUE
);
```

#### Exemples de codes promo

**Réduction 20% pour commande >= 50€**
```sql
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses_per_user, is_active)
VALUES ('GROS50', '20% de réduction sur commande de 50€ ou plus', 'percentage', 20, 50.00, 1, TRUE);
```

**5€ de réduction pour nouveaux utilisateurs**
```sql
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, new_users_only, max_uses_per_user, is_active)
VALUES ('NOUVEAU5', '5€ offerts pour votre première commande', 'fixed', 5.00, 15.00, TRUE, 1, TRUE);
```

**Livraison gratuite le weekend**
```sql
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, max_uses_per_user, is_active)
VALUES ('WEEKEND', 'Livraison gratuite le weekend', 'free_delivery', 0, 25.00, 1, TRUE);
```

## 📊 Suivi et Statistiques

### Voir les utilisations d'un code promo

```sql
SELECT 
    pc.code,
    pc.description,
    pc.current_uses,
    pc.max_uses,
    COUNT(pcu.id) as total_utilisations,
    SUM(pcu.discount_amount) as total_reductions,
    AVG(pcu.order_amount) as panier_moyen
FROM promo_codes pc
LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
WHERE pc.code = 'BIENVENUE10'
GROUP BY pc.id, pc.code, pc.description, pc.current_uses, pc.max_uses;
```

### Voir les codes promo les plus utilisés

```sql
SELECT 
    pc.code,
    pc.description,
    COUNT(pcu.id) as utilisations,
    SUM(pcu.discount_amount) as total_reductions
FROM promo_codes pc
LEFT JOIN promo_code_usage pcu ON pc.id = pcu.promo_code_id
WHERE pc.is_active = TRUE
GROUP BY pc.id, pc.code, pc.description
ORDER BY utilisations DESC
LIMIT 10;
```

## 🎯 Stratégies Marketing

### 1. **Acquisition de Nouveaux Clients**
- Codes "BIENVENUE" avec réduction importante
- Livraison gratuite pour première commande
- Codes partagés sur les réseaux sociaux

### 2. **Fidélisation**
- Codes pour clients réguliers
- Offres spéciales selon l'historique
- Codes anniversaire automatiques

### 3. **Boost des Ventes**
- Codes weekend pour augmenter les commandes
- Codes flash (durée limitée)
- Codes pour paniers moyens élevés

### 4. **Promotions Saisonnières**
- Codes Noël, Nouvel An, etc.
- Codes événements locaux
- Codes partenariats

## 🔧 Configuration Avancée

### Modifier les codes promo par défaut

Les codes par défaut sont créés dans la migration SQL. Pour les modifier :

```sql
UPDATE promo_codes
SET discount_value = 15, min_order_amount = 20.00
WHERE code = 'BIENVENUE10';
```

### Désactiver un code promo

```sql
UPDATE promo_codes
SET is_active = FALSE
WHERE code = 'WEEKEND15';
```

### Limiter un code à un restaurant

```sql
UPDATE promo_codes
SET restaurant_id = 'uuid-du-restaurant'
WHERE code = 'RESTAURANT10';
```

## 📱 Intégration dans le Checkout

Le composant `PromoCodeInput` est automatiquement affiché dans le checkout et :
- Valide le code en temps réel
- Affiche la réduction appliquée
- Calcule automatiquement le nouveau total
- Enregistre l'utilisation après paiement

## ✅ Avantages

1. **Augmentation des ventes** : Incite à commander plus
2. **Acquisition clients** : Attire de nouveaux clients
3. **Fidélisation** : Encourage les commandes répétées
4. **Flexibilité** : Facile à créer et gérer
5. **Suivi** : Statistiques complètes sur l'utilisation

## 🚨 Points d'Attention

- Vérifier les dates de validité régulièrement
- Surveiller les abus (même utilisateur, plusieurs comptes)
- Limiter les réductions trop importantes
- Tester les codes avant de les publier

---

**Date de création** : 22 novembre 2025  
**Version** : 1.0

