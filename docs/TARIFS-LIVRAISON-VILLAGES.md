# Tarifs de livraison

**Restaurant de référence :** Ganges (34190)  
**Distance max :** plafond par la route selon le code postal (souvent 10–13 km ; **30170** Saint-Hippolyte-du-Fort : jusqu’à **15 km** route, ~14 km depuis Ganges). Au-delà : refus.

---

## Tarifs fixes par commune

| Commune | Frais |
|--------|--------|
| **Ganges** | **3,00 €** |
| **Laroque** | **5,00 €** |
| **Moulès (-et-Baucels)** | **5,00 €** |
| **Cazilhac** | **5,00 €** *(plus de surcharge travaux pont)* |
| **Brissac** | **7,50 €** |
| **Saint-Hippolyte-du-Fort** (30170) | **8,50 €** |
| **Le Vigan** (30120) | **10,00 €** *(min. 25 €)* |
| **Avèze** (30120) | **11,00 €** *(min. 25 €)* |
| **Bréau-et-Salagosse** (30120) | **14,00 €** *(min. 25 €)* |
| **Autres villages** (voir liste ci-dessous) | **7,00 €** |

### Villages livrés à 7,00 €

Saint-Bauzille-de-Putois, Sumène, Agonès, Gorniès, Saint-Julien-de-la-Nef, Saint-Laurent-le-Minier, Saint-Martial, Saint-Roman-de-Codières, Roquedur.

---

## Villes livrées / non livrées

- **Livrées :** communes dans la zone (codes postaux **34190**, **30440**, **30170**, **30120** pour Le Vigan / Avèze / Bréau-et-Salagosse, et adresses géolocalisées dans les plafonds de distance appliqués par l’API).
- **Non livrées :** Pégairolles-de-Buèges, Saint-Bresson, Montoulieu, et toute adresse hors plafond de distance (souvent 10–13 km route ; 15 km pour 30170).
- **Adresse bloquée :** Mas de Lamalou (Brissac).

---

## Abonnement **CVN'EAT Plus** (remise sur la livraison)

- Sous-total articles (après code promo) **≥ 20 €** et adresse **dans la zone** desservie.
- Avantage : **−50 % sur les frais de livraison** (le client ne paie que la moitié côté plateforme ; l’abonnement mensuel ne vise pas à offrir 100 % des courses, ce qui pèse sur le livreur / la distance / les villages éloignés).
- Indicatif d’abonnement : dès **4,99 €/mois** (prix réel = produit Stripe). Variable d’environnement : `STRIPE_CVNEAT_PLUS_PRICE_ID` (l’ancien `STRIPE_VNEAT_PLUS_PRICE_ID` reste pris en charge côté code en secours).

*Dernière mise à jour : mai 2026 — fin surcharge Cazilhac (+2,50 € travaux pont).*
