# 🔧 Correction Automatique des Commandes avec Formules

## 🎯 Problème

Les commandes du Cévenol Burger avec des formules n'avaient pas de détails de commande, rendant les commandes invisibles pour le restaurant.

## ✅ Solution

### 1. Correction du Code (Déjà Appliquée)

Le code dans `app/api/orders/route.js` a été corrigé pour créer automatiquement les détails pour les nouvelles commandes avec formules.

### 2. Correction des Commandes Existantes

**Script automatique** : `corriger-toutes-commandes-formules.js`

Ce script :
- ✅ Trouve toutes les commandes du Cévenol Burger sans détails
- ✅ Identifie automatiquement la formule la plus probable selon le prix
- ✅ Crée les détails de commande manquants
- ✅ Ajoute automatiquement une boisson par défaut

## 🚀 Utilisation

### Exécuter le Script

```bash
node scripts/corriger-toutes-commandes-formules.js
```

### Ce que fait le Script

1. **Recherche** les commandes du Cévenol Burger sans détails
2. **Identifie** la formule la plus probable (selon le prix)
3. **Crée** les détails de commande :
   - Burger (avec le prix total de la formule)
   - Frites (prix: 0€)
   - Boisson (prix: 0€)
4. **Affiche** un résumé des corrections

### Exemple de Sortie

```
🔍 Recherche des commandes sans détails du Cévenol Burger...

🏪 Restaurant trouvé: Le Cévenol Burger (ID: abc-123)

📊 5 commandes du Cévenol Burger trouvées

🔧 3 commandes à corriger

📦 2 formules trouvées

🔧 Traitement commande abc12345...
   Total: 15.00€
   Date: 21/11/2025 20:30:00
   📦 Formule sélectionnée: Formule Classic (15.00€)
   ✅ Burger Classic (15.00€)
   ✅ Frites (0€)
   🥤 Coca-Cola (0€)
   ✅ 3 détails créés avec succès

📊 RÉSUMÉ:
   ✅ Commandes corrigées: 3
   ❌ Erreurs: 0
   📦 Total traité: 3

✅ Script terminé
```

## ⚠️ Important

- Le script utilise le **prix de la commande** pour deviner quelle formule a été commandée
- Si plusieurs formules ont le même prix, il prend la première trouvée
- La boisson ajoutée est la première disponible dans les options de la formule
- **Aucune donnée n'est supprimée**, seulement des détails sont ajoutés

## 🔄 Après Exécution

1. Vérifiez dans Supabase que les détails ont été créés :
```sql
SELECT 
    c.id,
    c.total,
    COUNT(dc.id) as nb_details
FROM commandes c
LEFT JOIN details_commande dc ON c.id = dc.commande_id
WHERE c.restaurant_id = 'ID_RESTAURANT'
GROUP BY c.id, c.total
HAVING COUNT(dc.id) = 0;
```

2. Vérifiez dans l'interface restaurant que les commandes apparaissent maintenant

## 📝 Notes

- Le script peut être exécuté plusieurs fois sans problème (il ignore les commandes qui ont déjà des détails)
- Les commandes corrigées gardent leur historique et leur statut
- Le prix total reste sur le premier élément (burger) comme prévu

---

**Date** : 22 novembre 2025  
**Version** : 1.0

