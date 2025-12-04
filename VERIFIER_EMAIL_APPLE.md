# ✅ Vérifier votre Email Apple ID

## ❌ Problème

Xcode affiche : **"Please verify the email address associated with your Apple Account"**

Cela signifie que votre compte Apple ID existe, mais **l'adresse email n'a pas été vérifiée**.

---

## ✅ Solution : Vérifier votre Email

### Étape 1 : Aller sur le site Apple ID

1. **Ouvrez votre navigateur** (Safari, Chrome, etc.)
2. **Allez sur :** https://appleid.apple.com
3. **Connectez-vous** avec votre compte Apple ID (celui que vous utilisez dans Xcode)

### Étape 2 : Vérifier votre Email

1. Une fois connecté, vous verrez votre compte
2. **Vérifiez votre adresse email** :
   - Si vous voyez un message "Email non vérifié" ou un point d'exclamation
   - **Cliquez sur "Vérifier"** ou "Verify"
   - Apple va vous envoyer un email de vérification

### Étape 3 : Confirmer l'Email

1. **Ouvrez votre boîte email** (celle associée à votre Apple ID)
2. **Cherchez un email d'Apple** (peut être dans les spams)
3. **Cliquez sur le lien de vérification** dans l'email
4. **Confirmez** la vérification

### Étape 4 : Revenir dans Xcode

1. **Fermez** la fenêtre d'erreur dans Xcode (cliquez sur "OK")
2. **Fermez** la fenêtre "Apple Accounts"
3. **Revenez** dans "Signing & Capabilities"
4. **Réessayez** de sélectionner votre Team

---

## 🔍 Alternative : Vérifier depuis les Réglages Mac

1. **Apple Menu** (🍎) → **System Settings** (ou **System Preferences**)
2. **Apple ID** (en haut)
3. Vérifiez si votre email est marqué comme "Vérifié" ou "Verified"

---

## ⚠️ Si vous ne recevez pas l'Email

1. **Vérifiez vos spams**
2. **Vérifiez que l'adresse email est correcte** dans votre compte Apple ID
3. **Réessayez** d'envoyer l'email de vérification depuis appleid.apple.com

---

## 📝 Après la Vérification

Une fois l'email vérifié :

1. **Dans Xcode**, retournez dans "Signing & Capabilities"
2. **Sélectionnez votre Team** (votre compte Apple ID)
3. Xcode devrait maintenant accepter votre compte

---

## 🎯 Résumé

1. ✅ Allez sur https://appleid.apple.com
2. ✅ Connectez-vous avec votre compte
3. ✅ Vérifiez votre email (cliquez sur le lien dans l'email reçu)
4. ✅ Revenez dans Xcode et réessayez

**C'est une étape de sécurité standard d'Apple !** 🔒

