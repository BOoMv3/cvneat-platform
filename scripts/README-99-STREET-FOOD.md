# 99 Street Food – Explication (ce que font les scripts)

## En résumé

Tu as **4 factures / virements** pour 99 Street Food depuis le début. Le **dernier virement** date du **05/03/2026** (facture FAC-2026-000008, 575,32 €).

Tout ce qui est **avant le 05/03/2026** est considéré comme déjà réglé (couvert par tes virements).  
Ce que tu dois à 99 Street Food, c’est **uniquement les commandes à partir du 05/03/2026**.

---

## Ce que fait le dashboard (paiements / virements)

- **Total dû** = somme des commandes « livrée + payée » (part restaurant).
- **Total versé** = somme des virements enregistrés dans `restaurant_transfers`.
- **Reste à payer** = Total dû − Total versé (et jamais en dessous de 0).

Donc si tu as beaucoup versé (les 4 factures = 2278,91 €) et peu de commandes récentes (depuis le 05/03), le « reste à payer » peut s’afficher à **0 €** alors que tu as quand même des commandes depuis le 05/03. Pour que l’affichage soit correct, on doit **ne plus compter** les anciennes commandes (avant le 05/03).

---

## Ce que font les scripts

### 1. Script principal : `99-street-food-remettre-au-propre-toutes-factures.sql`

- **Étape 1** : Supprime les anciens virements 99 SF en base (pour repartir propre).
- **Étape 2** : Ré-enregistre tes **4 virements** (les 4 factures) dans `restaurant_transfers` :
  - FAC-2025-589248 : 477,58 €  
  - FAC-2026-3056BC : 707,49 €  
  - FAC-2026-000003 : 518,62 €  
  - FAC-2026-000008 : 575,32 € (dernier, du 05/03/2026)
- **Étape 3** : Passe en **annulée** toutes les commandes 99 SF **créées avant le 05/03/2026**.  
  → Elles ne comptent plus dans le « total dû » du dashboard (on considère qu’elles sont couvertes par tes virements).
- **Étape 4** : Affiche un résumé : nombre de commandes depuis le 05/03, total dû, total déjà viré, **reste à payer**.

Résultat : le « total dû » ne contient plus que les commandes **à partir du 05/03/2026**. Le « reste à payer » du dashboard reflète ce que tu dois vraiment pour la période après le dernier virement.

### 2. Script de rattrapage : `99-street-food-appliquer-coupure-05-mars.sql`

À utiliser **si tu as déjà exécuté** le script principal **avec l’ancienne date (12/01)** au lieu du 05/03.

- **Étape 1** : Repasse en **annulée** toutes les commandes 99 SF **avant le 05/03/2026** (comme l’étape 3 du script principal, mais avec la bonne date).
- **Étape 2** : Réaffiche le résumé (nb commandes depuis le 05/03, total dû, total viré, reste à payer).

Tu l’exécutes une fois pour « corriger » la coupure et revoir le bon montant dû.

### 3. Sauvegarde / restauration

- **`SAVE-avant-99sf-remettre-propre.sql`** : à lancer **avant** le script principal ; crée des tables de backup (commandes et virements 99 SF).
- **`RESTORE-apres-99sf-remettre-propre.sql`** : à lancer **seulement si** tu veux annuler les changements et revenir à l’état avant le script principal.

---

## Script d’audit et correction : `99-street-food-audit-et-correction.sql` (recommandé)

Ce script reprend tout depuis la base (comme la gestion des commandes) et corrige ce qui a été modifié à tort :

1. **Recompte** : affiche toutes les commandes 99 SF par statut / paiement (comme en gestion des commandes).
2. **Virements** : affiche les virements déjà en base pour 99 SF.
3. **Restauration** : remet en **livrée + payée** toutes les commandes 99 SF qui ont été mises « annulées » sans remboursement Stripe, **sauf les 3 dernières** (celles qu’on avait volontairement annulées « ce soir-là »).
4. **4 virements** : supprime les virements 99 SF existants et ré-insère les 4 factures (évite doublons).
5. **Résultat** : affiche le **nombre de commandes** et le **montant dû depuis le 05/03/2026** (aligné avec la page Admin > Paiements / Virements).

À exécuter dans Supabase > SQL Editor (tout d’un coup ou bloc par bloc). Après exécution, la page « Montants dus aux restaurants » et le tableau de bord reflètent le bon nombre de commandes et le bon montant dû pour 99 Street Food.

---

## Ordre conseillé

1. Exécuter **99-street-food-audit-et-correction.sql** (audit + restauration + 4 virements + résultat depuis 05/03/26).
2. (Optionnel) Si tu veux une sauvegarde avant : **SAVE-avant-99sf-remettre-propre.sql**, puis le script d’audit ci-dessus.
3. Si tu avais seulement besoin d’appliquer la coupure au 05/03 après un ancien script : **99-street-food-appliquer-coupure-05-mars.sql**.

Après ça, le dashboard « Total versé » et « Reste à payer » pour 99 Street Food sont cohérents avec tes 4 factures et les commandes **depuis le 05/03/2026**.
