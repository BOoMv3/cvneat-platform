# Guide : Configuration du Menu Enfants avec choix optionnels

## Résumé des modifications

J'ai ajouté un système permettant aux formules (comme le Menu Enfants) d'avoir des choix optionnels. Le client peut maintenant choisir entre différentes options lors de la commande.

## Modifications apportées

### 1. Components/MenuItemModal.js
- Ajout de l'état `selectedFormulaOptions` pour gérer les choix optionnels
- Affichage des choix optionnels dans la modal pour les formules
- Validation que les choix requis sont sélectionnés avant d'ajouter au panier
- Détection automatique du Menu Enfants et affichage des choix (Cheese Burger OU 4 Nuggets)

### 2. app/api/orders/route.js
- Modification de la création de commande pour gérer les choix optionnels
- Seuls les items sélectionnés sont créés dans `details_commande`
- Les items non-sélectionnés dans un groupe de choix sont ignorés

### 3. app/partner/orders/page.js
- Support pour l'affichage des boissons de menu (déjà fait précédemment)

## Configuration du Menu Enfants

Pour que le Menu Enfants fonctionne avec les choix, vous devez :

### Option 1 : Configuration automatique (recommandée)

Le système détecte automatiquement le Menu Enfants et permet de choisir entre les items qui contiennent "cheese", "burger", "nugget" ou "4 nuggets" dans leur nom.

1. Assurez-vous que le Menu Enfants a ces `formula_items` :
   - Cheese Burger
   - 4 Nuggets (ou 6 Nuggets)
   - Mini Tacos
   - Frites (si applicable)
   - Surprise (si applicable)

2. Les deux premiers (Cheese Burger et Nuggets) seront automatiquement proposés comme choix

### Option 2 : Configuration manuelle avec formula_choice_groups

Pour plus de contrôle, vous pouvez ajouter un champ `formula_choice_groups` à la formule dans la base de données :

```json
{
  "id": "choice_group_1",
  "title": "Choix principal",
  "required": true,
  "options": [
    {
      "id": "cheese_burger_id",
      "nom": "Cheese Burger"
    },
    {
      "id": "4_nuggets_id",
      "nom": "4 Nuggets"
    }
  ]
}
```

## Mise à jour du script O'Toasty

Pour mettre à jour le script `update-otoasty-menu.js`, assurez-vous d'inclure les deux options dans formula_items :

```javascript
// Ajouter Cheese Burger ET 4 Nuggets comme formula_items
// Le système détectera automatiquement qu'ils sont des choix

await supabaseAdmin
  .from('formula_items')
  .insert([
    {
      formula_id: menuEnfants.id,
      menu_id: cheeseBurgerId,  // Cheese Burger
      quantity: 1,
      order_index: 1,
      is_optional: true,  // Optionnel : peut être dans un groupe de choix
      choice_group: 'main_choice'  // Groupe de choix
    },
    {
      formula_id: menuEnfants.id,
      menu_id: nuggetsId,  // 4 Nuggets
      quantity: 1,
      order_index: 1,
      is_optional: true,
      choice_group: 'main_choice'  // Même groupe = choix exclusif
    },
    {
      formula_id: menuEnfants.id,
      menu_id: miniTacosId,  // Mini Tacos (fixe)
      quantity: 1,
      order_index: 2,
      is_optional: false  // Pas optionnel
    }
  ]);
```

**Note** : Si les champs `is_optional` et `choice_group` n'existent pas dans la table `formula_items`, le système utilisera la détection automatique basée sur les noms.

## Test

Pour tester :

1. Ouvrir le Menu Enfants dans l'interface client
2. Vérifier que les choix "Cheese Burger" et "4 Nuggets" apparaissent
3. Sélectionner une option
4. Choisir une boisson
5. Ajouter au panier
6. Vérifier dans la commande que seul l'item choisi est présent

## Prochaines étapes

Pour améliorer le système, vous pourriez :

1. Ajouter les colonnes `is_optional` et `choice_group` à la table `formula_items`
2. Créer une interface dans le dashboard partenaire pour configurer les groupes de choix
3. Ajouter plus de flexibilité pour les formules complexes avec plusieurs groupes de choix

