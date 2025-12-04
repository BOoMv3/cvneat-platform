#!/bin/bash

# Script pour installer les Pods iOS après que CocoaPods soit installé
# Usage: ./scripts/install-pods.sh

set -e

echo "🍎 Installation des dépendances iOS (CocoaPods)..."
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier que CocoaPods est installé
if ! command -v pod &> /dev/null; then
    echo "❌ CocoaPods n'est pas installé"
    echo ""
    echo "📝 Pour installer CocoaPods, exécutez dans votre terminal :"
    echo "   sudo gem install cocoapods"
    echo ""
    echo "⏱️  Durée : 2-5 minutes"
    echo "   (Vous devrez entrer votre mot de passe administrateur)"
    echo ""
    exit 1
fi

echo "✅ CocoaPods est installé ($(pod --version))"
echo ""

# Vérifier que le dossier ios existe
if [ ! -d "ios/App" ]; then
    echo "❌ Erreur: Le dossier ios/App n'existe pas"
    echo "   Lancez d'abord: npm run build:ios"
    exit 1
fi

# Installer les dépendances CocoaPods
echo "📦 Installation des Pods iOS..."
echo "   (Cela peut prendre 5-10 minutes la première fois)"
echo ""

cd ios/App

# Nettoyer si nécessaire
if [ -d "Pods" ]; then
    echo "🧹 Nettoyage des Pods existants..."
    rm -rf Pods Podfile.lock
fi

# Installer les Pods
pod install

cd ../..

echo ""
echo "✅ Dépendances iOS installées avec succès!"
echo ""
echo "📱 Prochaines étapes:"
echo "   1. Ouvrez Xcode: npm run capacitor:open:ios"
echo "   2. Dans Xcode:"
echo "      - Sélectionnez le projet 'App' dans le panneau de gauche"
echo "      - Onglet 'Signing & Capabilities'"
echo "      - Cochez 'Automatically manage signing'"
echo "      - Sélectionnez votre Team (votre compte Apple)"
echo "   3. Sélectionnez un simulateur iOS ou votre iPhone"
echo "   4. Cliquez sur Run (▶️)"
echo ""

