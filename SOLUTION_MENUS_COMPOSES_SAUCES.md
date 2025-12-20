# Solution : Ajouter le support des sauces dans les menus composés

## Problème identifié

1. **Pas d'option pour les sauces dans les menus composés** : Contrairement aux menus normaux qui ont un champ `sauce_options` dans la table `menus`, les menus composés n'ont pas de système pour gérer les sauces.

2. **Affichage incorrect des variantes** : Le problème "boeuf brebis" toujours affiché suggère qu'une variante par défaut est utilisée même si le client choisit autre chose.

3. **Sauces mises en supplément** : Les sauces sont actuellement mises en supplément au lieu d'être dans les détails du combo.

## Solution proposée

### Option 1 : Ajouter une étape "Sauces" dans les menus composés (RECOMMANDÉ)

Permettre au restaurant de créer une étape spécifique pour les sauces dans la configuration du menu composé. Cette étape fonctionnerait comme les autres étapes mais serait spécialement dédiée aux sauces.

**Avantages :**
- Flexible : chaque menu composé peut avoir ses propres options de sauces
- Cohérent avec l'architecture existante des menus composés
- Permet de définir le nombre minimum/maximum de sauces

### Option 2 : Ajouter un système similaire aux menus normaux

Ajouter un champ `sauce_options` au niveau du combo lui-même (dans `menu_combos`), similaire aux menus normaux.

**Avantages :**
- Plus simple à implémenter
- Cohérent avec le système des menus normaux

**Inconvénients :**
- Toutes les options de sauces s'appliquent au combo entier, pas à un article spécifique
- Moins flexible

## Implémentation recommandée (Option 1)

### 1. Modifications nécessaires dans le code

#### A. Interface d'administration (app/partner/page.js)
- Permettre la création d'une étape "Sauces" avec des options personnalisées
- Ou ajouter un bouton "Ajouter étape sauces" qui crée automatiquement une étape avec des options de sauces prédéfinies

#### B. Modal client (app/restaurants/[id]/page.js)
- Afficher les sauces comme les autres options dans une étape dédiée
- Permettre la sélection multiple selon min/max définis

#### C. Sauvegarde dans la commande (app/api/orders/route.js)
- Sauvegarder les sauces sélectionnées dans `comboDetails`
- S'assurer qu'elles ne sont pas mises en supplément mais bien dans les détails

#### D. Affichage côté restaurant
- Afficher les sauces sélectionnées dans les détails de la commande

### 2. Correction du problème "boeuf brebis"

Le problème vient probablement de :
- Une variante par défaut qui est toujours sélectionnée
- Ou l'affichage qui montre toujours la première variante au lieu de celle sélectionnée

**Solution :**
- Vérifier que la variante sélectionnée est bien sauvegardée dans `comboSelections`
- S'assurer que lors de l'affichage, on utilise la variante sélectionnée et non une par défaut

## Prochaines étapes

1. Décider de l'option à implémenter (Option 1 recommandée)
2. Implémenter les modifications dans l'interface d'administration
3. Modifier le modal client pour afficher et sélectionner les sauces
4. Corriger la sauvegarde et l'affichage
5. Tester avec un menu composé réel

