#!/bin/bash

# Script pour builder l'app mobile (iOS/Android)
# Les routes API sont exclues car elles seront appelées sur le serveur distant

echo "🔧 Préparation du build mobile..."

# Déplacer temporairement le dossier API
if [ -d "app/api" ]; then
  echo "📦 Déplacement temporaire des routes API..."
  mv app/api app/api_backup
fi

echo "🏗️ Build en cours..."

# Faire le build avec BUILD_MOBILE=true
BUILD_MOBILE=true npm run build

BUILD_RESULT=$?

# Restaurer le dossier API
if [ -d "app/api_backup" ]; then
  echo "♻️ Restauration des routes API..."
  mv app/api_backup app/api
fi

if [ $BUILD_RESULT -eq 0 ]; then
  echo "✅ Build mobile terminé avec succès!"
  echo ""
  echo "📱 Prochaine étape: Synchroniser avec Capacitor"
  echo "   npx cap sync ios"
else
  echo "❌ Erreur lors du build mobile"
  exit 1
fi
