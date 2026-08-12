# CVNEAT Print Agent (Android) — Sunmi V2 Pro

Petite app Android dédiée à l’impression automatique des bons de commande.

## Pourquoi

- Sur iPhone/iPad, l’impression ESC/POS Bluetooth n’est pas fiable.
- Les **Sunmi V2 Pro** ont une **imprimante thermique intégrée** : on imprime directement dessus, sans RawBT ni imprimante Bluetooth externe.

## Fonctionnement

1. Connexion avec le compte partenaire (email / mot de passe).
2. Sélection imprimante :
   - **Sunmi intégrée** (détectée auto sur V2 Pro)
   - ou Bluetooth pairée (ancien mode)
3. L’app poll les jobs `print_receipt` :
   - `GET /api/partner/notifications?unreadOnly=1&type=print_receipt`
4. Impression puis marquage lu :
   - `PATCH /api/partner/notifications`

Les jobs sont créés automatiquement au paiement (Stripe webhook / payment confirm).

## Installation Sunmi V2 Pro (partenaires)

1. Ouvrir le projet `print-agent/android/` dans Android Studio.
2. Build → Installer l’APK sur le Sunmi.
3. Ouvrir **CVNEAT Print Agent**.
4. Se connecter avec le compte restaurant.
5. Vérifier « Sunmi (imprimante intégrée) » → **Test impression**.
6. Laisser l’app ouverte (idéalement en kiosk / toujours allumée).

## App Capacitor CVN’EAT (même appareil)

Sur l’app Android `fr.cvneat.app`, le bouton **Imprimer** du dashboard partenaire utilise d’abord l’imprimante Sunmi intégrée (plugin natif), puis RawBT en secours.

## Test sans vraie commande

Admin :

- `POST /api/admin/restaurants/enqueue-print-test` avec `{ "restaurantId": "<id>" }`

## Versions

- `1.1.0-sunmi` : support imprimante intégrée Sunmi + Bluetooth legacy
