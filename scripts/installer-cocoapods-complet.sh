#!/bin/bash

# Script pour installer CocoaPods complètement

echo "🍎 Installation complète de CocoaPods..."
echo ""

# Vérifier si pod existe déjà
if command -v pod &> /dev/null; then
    VERSION=$(pod --version)
    echo "✅ CocoaPods est déjà installé (version $VERSION)"
    exit 0
fi

echo "📦 Installation de CocoaPods..."
echo "   (Cela peut prendre 2-5 minutes)"
echo ""

# Installer CocoaPods
sudo gem install cocoapods

# Vérifier l'installation
if command -v pod &> /dev/null; then
    VERSION=$(pod --version)
    echo ""
    echo "✅ CocoaPods installé avec succès !"
    echo "   Version: $VERSION"
    echo ""
    echo "🎉 Vous pouvez maintenant installer les Pods iOS :"
    echo "   ./scripts/install-pods.sh"
else
    echo ""
    echo "⚠️  Installation terminée mais 'pod' n'est pas dans le PATH"
    echo ""
    echo "💡 Essayez de :"
    echo "   1. Fermer et rouvrir votre terminal"
    echo "   2. Puis taper : pod --version"
    echo ""
    echo "   Si ça ne marche pas, réessayez cette commande :"
    echo "   sudo gem install cocoapods"
fi

