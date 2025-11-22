# 📋 Guide : Corriger Manuellement une Commande avec Formule sans Détails

## 🎯 Objectif

Corriger une commande existante du Cévenol Burger qui n'a pas de détails de commande à cause du bug des formules.

---

## 📝 Méthode 1 : Via Supabase SQL Editor (Recommandé)

### Étape 1 : Identifier la Commande Problématique

1. Ouvrez **Supabase Dashboard** → **SQL Editor**
2. Exécutez cette requête pour trouver les commandes sans détails :

```sql
SELECT 
    c.id,
    c.created_at,
    c.statut,
    c.total,
    r.nom as restaurant,
    COUNT(dc.id) as nb_details
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
LEFT JOIN details_commande dc ON c.id = dc.commande_id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
  AND NOT EXISTS (
    SELECT 1 FROM details_commande dc2 WHERE dc2.commande_id = c.id
  )
  AND c.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.id, c.created_at, c.statut, c.total, r.nom
ORDER BY c.created_at DESC;
```

3. **Notez l'ID de la commande** à corriger (ex: `abc123-def456-...`)

### Étape 2 : Récupérer les Données de la Commande

#### Option A : Depuis Stripe Dashboard

1. Allez sur **Stripe Dashboard** → **Paiements**
2. Recherchez le `payment_intent_id` de la commande (dans la table `commandes`, colonne `stripe_payment_intent_id`)
3. Ouvrez le paiement dans Stripe
4. Regardez les **Métadonnées** (`metadata`) qui contiennent généralement :
   - Les items de la commande
   - Les formules sélectionnées
   - Les boissons choisies

#### Option B : Depuis la Base de Données

```sql
-- Récupérer les infos de la commande
SELECT 
    c.*,
    r.nom as restaurant_nom
FROM commandes c
INNER JOIN restaurants r ON c.restaurant_id = r.id
WHERE c.id = 'COMMANDE_ID_ICI';  -- ⚠️ Remplacez par l'ID réel
```

### Étape 3 : Trouver la Formule et ses Éléments

```sql
-- Lister toutes les formules du Cévenol Burger
SELECT 
    f.id,
    f.nom,
    f.prix,
    COUNT(fi.id) as nb_elements
FROM formulas f
INNER JOIN restaurants r ON f.restaurant_id = r.id
LEFT JOIN formula_items fi ON f.id = fi.formula_id
WHERE (LOWER(r.nom) LIKE '%cévenol%' OR LOWER(r.nom) LIKE '%cevenol%')
GROUP BY f.id, f.nom, f.prix
ORDER BY f.nom;

-- Pour une formule spécifique, voir ses éléments
SELECT 
    f.id as formula_id,
    f.nom as formula_nom,
    f.prix as formula_prix,
    fi.order_index,
    fi.menu_id,
    m.nom as menu_nom,
    m.prix as menu_prix
FROM formulas f
INNER JOIN formula_items fi ON f.id = fi.formula_id
INNER JOIN menus m ON fi.menu_id = m.id
WHERE f.id = 'FORMULA_ID_ICI'  -- ⚠️ Remplacez par l'ID de la formule
ORDER BY fi.order_index;
```

**Notez** :
- L'ID de la formule
- Les IDs des menus (burger, frites, etc.)
- L'ordre des éléments (`order_index`)

### Étape 4 : Trouver la Boisson Sélectionnée

Si vous savez quelle boisson a été choisie :

```sql
-- Lister les boissons disponibles pour une formule
SELECT 
    m.id as drink_id,
    m.nom as drink_nom,
    m.prix as drink_prix
FROM formulas f
CROSS JOIN LATERAL jsonb_array_elements_text(f.drink_options) AS drink_id
INNER JOIN menus m ON m.id::text = drink_id
WHERE f.id = 'FORMULA_ID_ICI'  -- ⚠️ Remplacez par l'ID de la formule
ORDER BY m.nom;
```

**Si vous ne savez pas quelle boisson** : Utilisez la boisson la plus courante (généralement Coca-Cola) ou laissez-la de côté.

### Étape 5 : Créer les Détails de Commande

**⚠️ IMPORTANT** : Commencez par un `BEGIN;` et testez avec `ROLLBACK;` avant de faire `COMMIT;`

```sql
BEGIN;

-- Détail 1 : Burger (premier élément, avec le prix total de la formule)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'BURGER_MENU_ID_ICI',        -- ⚠️ ID du menu burger
    1,                            -- Quantité
    15.00,                        -- ⚠️ Prix total de la formule (vérifiez dans commandes.total)
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI',     -- ⚠️ ID de la formule
        'order_index', 0
    )
);

-- Détail 2 : Frites (deuxième élément, prix 0 car inclus)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'Frites_MENU_ID_ICI',        -- ⚠️ ID du menu frites
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus dans la formule
    jsonb_build_object(
        'is_formula_item', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI',     -- ⚠️ ID de la formule
        'order_index', 1
    )
);

-- Détail 3 : Boisson (si sélectionnée)
INSERT INTO details_commande (
    commande_id,
    plat_id,
    quantite,
    prix_unitaire,
    customizations
) VALUES (
    'COMMANDE_ID_ICI',           -- ⚠️ ID de la commande
    'DRINK_MENU_ID_ICI',         -- ⚠️ ID du menu boisson
    1,                            -- Quantité
    0.00,                         -- Prix 0 car inclus dans la formule
    jsonb_build_object(
        'is_formula_drink', true,
        'formula_name', 'Formule Classic',  -- ⚠️ Nom de la formule
        'formula_id', 'FORMULA_ID_ICI'      -- ⚠️ ID de la formule
    )
);

-- Vérifier avant de valider
SELECT 
    dc.id,
    m.nom as menu_nom,
    dc.quantite,
    dc.prix_unitaire,
    dc.customizations
FROM details_commande dc
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE dc.commande_id = 'COMMANDE_ID_ICI'  -- ⚠️ Remplacez par l'ID réel
ORDER BY 
    CASE 
        WHEN dc.customizations->>'is_formula_item' = 'true' 
        THEN (dc.customizations->>'order_index')::int
        ELSE 999
    END;

-- Si tout est correct, validez :
COMMIT;

-- Si erreur, annulez :
-- ROLLBACK;
```

### Étape 6 : Vérification Finale

```sql
-- Vérifier que la commande a maintenant des détails
SELECT 
    c.id,
    c.total,
    COUNT(dc.id) as nb_details,
    STRING_AGG(m.nom, ', ') as articles
FROM commandes c
LEFT JOIN details_commande dc ON c.id = dc.commande_id
LEFT JOIN menus m ON dc.plat_id = m.id
WHERE c.id = 'COMMANDE_ID_ICI'  -- ⚠️ Remplacez par l'ID réel
GROUP BY c.id, c.total;
```

---

## 📝 Méthode 2 : Via l'Interface Admin (Si Disponible)

Si vous avez une interface admin pour gérer les commandes :

1. Allez sur la page de gestion des commandes
2. Trouvez la commande problématique
3. Utilisez un bouton "Recréer les détails" (si disponible)
4. Ou contactez le développeur pour ajouter cette fonctionnalité

---

## 📝 Méthode 3 : Script Automatique (Avancé)

Si vous avez plusieurs commandes à corriger, vous pouvez créer un script Node.js :

```javascript
// scripts/corriger-commandes-formules.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function corrigerCommande(commandeId, formulaId, burgerId, fritesId, drinkId, prixTotal) {
  // Créer les détails
  const details = [
    {
      commande_id: commandeId,
      plat_id: burgerId,
      quantite: 1,
      prix_unitaire: prixTotal,
      customizations: {
        is_formula_item: true,
        formula_name: 'Formule',
        formula_id: formulaId,
        order_index: 0
      }
    },
    {
      commande_id: commandeId,
      plat_id: fritesId,
      quantite: 1,
      prix_unitaire: 0,
      customizations: {
        is_formula_item: true,
        formula_name: 'Formule',
        formula_id: formulaId,
        order_index: 1
      }
    }
  ];

  if (drinkId) {
    details.push({
      commande_id: commandeId,
      plat_id: drinkId,
      quantite: 1,
      prix_unitaire: 0,
      customizations: {
        is_formula_drink: true,
        formula_name: 'Formule',
        formula_id: formulaId
      }
    });
  }

  const { data, error } = await supabase
    .from('details_commande')
    .insert(details);

  if (error) {
    console.error('❌ Erreur:', error);
    return false;
  }

  console.log('✅ Détails créés:', data.length);
  return true;
}

// Utilisation
// corrigerCommande('commande-id', 'formula-id', 'burger-id', 'frites-id', 'drink-id', 15.00);
```

---

## ⚠️ Points d'Attention

1. **Vérifiez le prix total** : Le prix de la formule doit être sur le **premier élément** (burger), les autres à 0€
2. **Vérifiez les IDs** : Assurez-vous que tous les IDs (commande, formule, menus) sont corrects
3. **Testez d'abord** : Utilisez `BEGIN;` et `ROLLBACK;` avant de valider avec `COMMIT;`
4. **Quantité** : Si le client a commandé plusieurs formules, multipliez les quantités
5. **Boisson** : Si vous ne savez pas quelle boisson, vous pouvez laisser ce détail de côté

---

## 📞 Besoin d'Aide ?

Si vous avez des difficultés :
1. Utilisez le script `scripts/diagnostic-commandes-formules.sql` pour identifier les problèmes
2. Vérifiez les logs Stripe pour récupérer les données exactes
3. Contactez le support technique avec l'ID de la commande

---

## ✅ Checklist de Correction

- [ ] Commande identifiée (ID noté)
- [ ] Formule identifiée (ID noté)
- [ ] Éléments de la formule trouvés (burger, frites, boisson)
- [ ] IDs des menus récupérés
- [ ] Prix total vérifié
- [ ] Détails créés avec `BEGIN;`
- [ ] Vérification effectuée
- [ ] `COMMIT;` exécuté
- [ ] Commande vérifiée dans l'interface restaurant

---

**Date** : 22 novembre 2025  
**Version** : 1.0

