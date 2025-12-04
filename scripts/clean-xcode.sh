#!/bin/bash

echo "🧹 Nettoyage complet du projet Xcode..."

# Aller dans le dossier iOS
cd "$(dirname "$0")/../ios/App" || exit 1

# Supprimer les caches et fichiers de build
echo "📦 Suppression des Pods..."
rm -rf Pods
rm -f Podfile.lock

echo "🗑️  Suppression des fichiers de build Xcode..."
rm -rf ~/Library/Developer/Xcode/DerivedData/App-*
rm -rf build/
rm -rf *.xcworkspace/xcuserdata
rm -rf App.xcodeproj/xcuserdata
rm -rf App.xcodeproj/project.xcworkspace/xcuserdata

echo "✅ Nettoyage terminé!"
echo ""
echo "📱 Prochaines étapes dans Xcode:"
echo "   1. Product → Clean Build Folder (Cmd+Shift+K)"
echo "   2. Fermer et rouvrir Xcode"
echo "   3. Product → Build (Cmd+B)"

