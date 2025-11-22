# 💰 Calcul des Gains des Livreurs

## 📋 Description

Ces scripts permettent de calculer automatiquement les gains des livreurs basés sur les commandes livrées.

## 🔧 Méthodes Disponibles

### Méthode 1 : Script SQL (Supabase)

**Fichier** : `calcul-gains-livreur-ce-soir.sql`

**Utilisation** :
1. Ouvrez Supabase SQL Editor
2. Copiez-collez le contenu du fichier
3. Exécutez le script
4. Consultez les résultats

**Avantages** :
- ✅ Rapide et simple
- ✅ Pas besoin de Node.js
- ✅ Résultats détaillés par requête

### Méthode 2 : Script JavaScript (Node.js)

**Fichier** : `calcul-gains-livreur.js`

**Utilisation** :
```bash
# Depuis la racine du projet
node scripts/calcul-gains-livreur.js
```

**Avantages** :
- ✅ Résultats formatés et colorés
- ✅ Calcul automatique des bonus
- ✅ Statistiques détaillées
- ✅ Exportable facilement

## 💵 Politique de Rémunération

### Configuration Actuelle

**Dans le script JavaScript** (`calcul-gains-livreur.js`) :

```javascript
const TAUX_LIVREUR = 0.80;    // 80% des frais de livraison
const BONUS_NUIT = 1.00;      // +1€ par livraison de nuit (20h-6h)
const BONUS_DISTANCE = 2.00;  // +2€ si > 5km (à implémenter)
```

### Personnalisation

Pour modifier la politique de rémunération, éditez ces constantes dans `calcul-gains-livreur.js` :

**Option 1 - Livreur garde 100%** :
```javascript
const TAUX_LIVREUR = 1.00; // 100% des frais
```

**Option 2 - Taux fixe par livraison** :
```javascript
// À implémenter selon vos besoins
const GAIN_FIXE = 4.00; // 4€ par livraison
```

**Option 3 - Système mixte** :
```javascript
const TAUX_LIVREUR = 0.70;  // 70% des frais
const BONUS_MINIMUM = 2.50;  // Minimum 2.50€ par livraison
```

## 📊 Résultats Fournis

### 1. Statistiques Générales
- Nombre total de commandes
- Commandes livrées / en cours / annulées
- Période de calcul

### 2. Gains par Livreur
- Nom et coordonnées
- Nombre de livraisons
- Total des frais de livraison
- Gains de base
- Bonus appliqués
- **Gains net total**
- Moyenne par livraison

### 3. Détail des Livraisons
Pour chaque livreur :
- Heure de la livraison
- Restaurant
- Montant gagné
- Bonus éventuels

### 4. Résumé Global
- Nombre de livreurs actifs
- Total des livraisons
- Total des gains
- Moyennes

### 5. Répartition par Heure
- Livraisons par tranche horaire
- Gains par heure

## 📖 Exemples de Résultats

### Exemple 1 : Script JavaScript

```
💰 === CALCUL DES GAINS DES LIVREURS ===

📅 Date: 2025-11-21

📊 15 commandes trouvées aujourd'hui

📈 STATISTIQUES GÉNÉRALES:
   ✅ Livrées: 12
   🚚 En cours de livraison: 2
   ⏳ En attente: 1
   ❌ Annulées: 0

💰 GAINS PAR LIVREUR:

================================================================================

1. 👤 Ahmed Benali
   📱 +33 6 12 34 56 78
   📦 Nombre de livraisons: 8
   💵 Frais de livraison total: 28.00€
   💰 Gains de base (80%): 22.40€
   🎁 Bonus: +3.00€
   ✨ GAINS NET: 25.40€
   📊 Moyenne par livraison: 3.18€

   📋 Détail des livraisons:
      1. 19:30 - 99 Street Food - 2.80€
      2. 20:15 - Restaurant XYZ - 3.90€ +1.00€ (nuit)
      3. 21:00 - Pizza Palace - 3.90€ +1.00€ (nuit)
      ...

2. 👤 Marie Dupont
   📱 +33 6 98 76 54 32
   📦 Nombre de livraisons: 4
   💵 Frais de livraison total: 14.00€
   💰 Gains de base (80%): 11.20€
   ✨ GAINS NET: 11.20€
   📊 Moyenne par livraison: 2.80€

================================================================================

📊 RÉSUMÉ GLOBAL:

   👥 Nombre de livreurs actifs: 2
   📦 Total de livraisons: 12
   💵 Total frais de livraison: 42.00€
   💰 Total gains base: 33.60€
   🎁 Total bonus: 3.00€
   ✨ TOTAL GAINS NET: 36.60€
   📊 Moyenne par livreur: 18.30€
   📊 Moyenne par livraison: 3.05€

⏰ RÉPARTITION PAR HEURE:

   21h: 3 livraisons - 9.60€ de gains
   20h: 4 livraisons - 11.20€ de gains
   19h: 5 livraisons - 13.60€ de gains

================================================================================

💡 NOTES:
   • Taux de rémunération: 80% des frais de livraison
   • Bonus nuit (20h-6h): +1.00€ par livraison
   • Ces calculs sont basés sur les commandes livrées uniquement

✅ Calcul terminé !
```

### Exemple 2 : Script SQL

Le script SQL retourne plusieurs tables :
- Vue d'ensemble des commandes
- Détails des livraisons
- Gains par livreur
- Totaux globaux
- Répartition horaire

## ⚙️ Configuration Requise

### Pour le script JavaScript

**Variables d'environnement nécessaires** :
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Dépendances** :
- Node.js installé
- Package `@supabase/supabase-js`

## 🔍 Cas d'Usage

### 1. Calcul de fin de journée
```bash
# À exécuter chaque soir pour calculer les gains
node scripts/calcul-gains-livreur.js
```

### 2. Vérification hebdomadaire
Modifiez la date dans le script pour calculer sur plusieurs jours :
```javascript
// Dans calcul-gains-livreur.js
const date_debut = '2025-11-15';
const date_fin = '2025-11-21';
```

### 3. Export pour comptabilité
Redirigez la sortie vers un fichier :
```bash
node scripts/calcul-gains-livreur.js > gains-$(date +%Y-%m-%d).txt
```

## 🎯 Prochaines Améliorations Possibles

- [ ] Export CSV / Excel
- [ ] Calcul sur plusieurs jours/semaines
- [ ] Bonus automatiques basés sur la distance
- [ ] Pénalités pour retards/annulations
- [ ] Comparaison avec périodes précédentes
- [ ] Interface web pour consulter les gains
- [ ] Notifications automatiques aux livreurs

## 📞 Support

En cas de question sur les calculs de gains :
1. Vérifiez la configuration des taux
2. Vérifiez que les commandes ont bien un `livreur_id`
3. Vérifiez que les `frais_livraison` sont renseignés
4. Consultez les logs pour plus de détails

## 📄 Fichiers Associés

- `calcul-gains-livreur-ce-soir.sql` - Script SQL
- `calcul-gains-livreur.js` - Script JavaScript
- `README_CALCUL_GAINS.md` - Ce fichier

---

**Dernière mise à jour** : 21 novembre 2025

