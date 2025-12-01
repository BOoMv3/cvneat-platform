# 💰 Guide : Système de Suivi des Virements

Ce guide vous explique comment installer et utiliser le système de suivi des virements aux restaurants partenaires.

## 📋 Table des matières

1. [Installation](#installation)
2. [Utilisation](#utilisation)
3. [Enregistrer vos premiers virements](#enregistrer-vos-premiers-virements)

---

## 🔧 Installation

### Étape 1 : Créer la table dans Supabase

1. **Ouvrez Supabase Dashboard**
   - Allez sur [supabase.com](https://supabase.com)
   - Connectez-vous à votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur **"SQL Editor"**
   - Cliquez sur **"New query"**

3. **Exécutez le script SQL**
   - Ouvrez le fichier `create-payments-tracking-table.sql`
   - Copiez tout le contenu
   - Collez-le dans le SQL Editor
   - Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)

4. **Vérifiez que la table est créée**
   - Allez dans **"Table Editor"** dans le menu de gauche
   - Vous devriez voir la table `restaurant_transfers`

---

## 🎯 Utilisation

### Accéder à la page de suivi

1. Connectez-vous en tant qu'**admin**
2. Allez dans **Admin > Paiements**
3. Cliquez sur le bouton **"Suivi des Virements"**

Ou directement : `/admin/payments/transfers`

### Enregistrer un nouveau virement

1. Cliquez sur **"Nouveau Virement"**
2. Remplissez le formulaire :
   - **Restaurant** : Sélectionnez le restaurant (obligatoire)
   - **Montant** : Montant du virement en euros (obligatoire)
   - **Date du virement** : Date à laquelle vous avez effectué le virement (obligatoire)
   - **Numéro de référence** : Numéro de référence bancaire (optionnel mais recommandé)
   - **Période début/fin** : Période couverte par ce virement (optionnel)
   - **Notes** : Notes additionnelles (optionnel)
3. Cliquez sur **"Enregistrer"**

### Consulter l'historique

- **Recherche** : Utilisez la barre de recherche pour trouver un virement par restaurant ou référence
- **Filtre** : Filtrez par restaurant spécifique
- **Résumé** : Voir le total versé par restaurant dans les cartes en haut

---

## 📝 Enregistrer vos premiers virements

Vous avez mentionné avoir fait des virements à :
- **La Bonne Pâte**
- **Au Saona Tea**

Pour les enregistrer :

1. Allez sur `/admin/payments/transfers`
2. Cliquez sur **"Nouveau Virement"**
3. Pour chaque virement :

### Virement 1 : La Bonne Pâte
- Restaurant : **La Bonne Pâte**
- Montant : [montant du virement]
- Date : [date du virement]
- Référence : [votre numéro de référence]
- Notes : "Virement initial" (ou autre note)

### Virement 2 : Au Saona Tea
- Restaurant : **Au Saona Tea**
- Montant : [montant du virement]
- Date : [date du virement]
- Référence : [votre numéro de référence]
- Notes : "Virement initial" (ou autre note)

---

## 💡 Conseils

### Numéro de référence
Toujours remplir le **numéro de référence** du virement bancaire. Cela permet de :
- Vérifier rapidement dans votre relevé bancaire
- Éviter les doublons
- Tracer chaque paiement

### Période couverte
Si vous savez quelle période est couverte par le virement (ex: "Novembre 2025"), remplissez les dates :
- Cela permet de savoir quelles commandes ont été payées
- Facilite la réconciliation comptable

### Notes
Utilisez les notes pour :
- Mentionner des détails particuliers
- Noter les commandes incluses
- Ajouter des informations importantes

---

## 🔍 Fonctionnalités

### Recherche
- Recherchez par nom de restaurant
- Recherchez par numéro de référence

### Filtres
- Filtrez par restaurant pour voir tous les virements d'un restaurant

### Résumé
- Voir rapidement le total versé à chaque restaurant
- Les cartes en haut montrent le total par restaurant

### Historique complet
- Tous les virements sont listés dans l'ordre chronologique
- Date, montant, référence, période, notes

---

## ⚠️ Notes importantes

1. **Seuls les admins** peuvent voir et créer des virements
2. Les virements sont **permanents** - ils ne peuvent pas être supprimés facilement (nécessite des droits SQL)
3. Pour modifier un virement, vous devez avoir les droits admin

---

## 🐛 Dépannage

### La table n'apparaît pas
- Vérifiez que le script SQL a bien été exécuté
- Vérifiez dans les logs SQL s'il y a eu des erreurs

### Impossible d'enregistrer un virement
- Vérifiez que vous êtes bien connecté en tant qu'admin
- Vérifiez que le restaurant existe bien dans la base de données

### Les virements ne s'affichent pas
- Vérifiez les politiques RLS dans Supabase
- Assurez-vous que votre utilisateur a bien le rôle "admin"

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs dans la console du navigateur (F12)
2. Les logs dans Supabase Dashboard > Logs
3. Les politiques RLS dans Supabase Dashboard > Authentication > Policies

