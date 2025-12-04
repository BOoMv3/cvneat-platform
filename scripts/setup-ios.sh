#!/bin/bash

# Script pour configurer l'application iOS native
# Usage: ./scripts/setup-ios.sh

set -e

echo "🍎 Configuration de l'application iOS native pour CVN'EAT"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier que Capacitor est installé
if [ ! -d "node_modules/@capacitor/ios" ]; then
    echo "📦 Installation de Capacitor iOS..."
    npm install @capacitor/ios
fi

# Vérifier que CocoaPods est installé
if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods n'est pas installé"
    echo "   Installation de CocoaPods..."
    sudo gem install cocoapods
fi

# Vérifier que Xcode est installé
if [ ! -d "/Applications/Xcode.app" ]; then
    echo "⚠️  Xcode n'est pas installé"
    echo "   Veuillez installer Xcode depuis l'App Store"
    echo "   https://apps.apple.com/app/xcode/id497799835"
    exit 1
fi

# Vérifier que le dossier ios existe
if [ ! -d "ios" ]; then
    echo "📱 Création du projet iOS avec Capacitor..."
    npx cap add ios
    echo "✅ Projet iOS créé"
else
    echo "✅ Le projet iOS existe déjà"
fi

# Builder l'application
echo ""
echo "📦 Build de l'application Next.js..."
BUILD_MOBILE=true npm run build

if [ ! -d "out" ]; then
    echo "❌ Erreur: Le dossier 'out' n'existe pas après le build"
    exit 1
fi

# Synchroniser avec Capacitor
echo ""
echo "🔄 Synchronisation avec Capacitor..."
npx cap sync ios

# Installer les dépendances CocoaPods
if [ -d "ios/App" ]; then
    echo ""
    echo "📦 Installation des dépendances iOS (CocoaPods)..."
    cd ios/App
    pod install
    cd ../..
    echo "✅ Dépendances iOS installées"
fi

echo ""
echo "🎉 Configuration terminée avec succès!"
echo ""
echo "📱 Prochaines étapes:"
echo "   1. Ouvrez Xcode: npm run capacitor:open:ios"
echo "   2. Sélectionnez votre équipe dans Signing & Capabilities"
echo "   3. Sélectionnez un simulateur ou votre iPhone"
echo "   4. Cliquez sur Run (▶️)"
echo ""
echo "💡 Pour plus d'informations, consultez GUIDE_APP_IOS_NATIVE.md"




