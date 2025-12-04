#!/bin/bash

# Script pour vérifier si CocoaPods est installé et guider l'installation

echo "🔍 Vérification de CocoaPods..."
echo ""

# Vérifier si pod est dans le PATH
if command -v pod &> /dev/null; then
    VERSION=$(pod --version)
    echo "✅ CocoaPods est installé !"
    echo "   Version: $VERSION"
    echo ""
    echo "🎉 Vous pouvez maintenant installer les Pods iOS :"
    echo "   ./scripts/install-pods.sh"
    exit 0
fi

echo "❌ CocoaPods n'est pas installé"
echo ""

# Vérifier si gem est disponible
if ! command -v gem &> /dev/null; then
    echo "⚠️  Ruby/gem n'est pas trouvé"
    echo "   Installation des outils Xcode..."
    echo ""
    echo "📝 Exécutez cette commande dans votre terminal :"
    echo "   xcode-select --install"
    exit 1
fi

echo "✅ Ruby est installé"
echo ""

echo "📝 Pour installer CocoaPods, suivez ces étapes :"
echo ""
echo "1. Ouvrez un NOUVEAU terminal"
echo "2. Tapez cette commande :"
echo ""
echo "   sudo gem install cocoapods"
echo ""
echo "3. Appuyez sur ENTREE"
echo ""
echo "4. Vous verrez : Password:"
echo "   ⚠️  IMPORTANT : Tapez votre mot de passe Mac"
echo "   ⚠️  Le mot de passe ne s'affichera PAS (c'est normal !)"
echo "   ⚠️  Tapez-le quand même puis appuyez sur ENTREE"
echo ""
echo "5. Attendez 2-5 minutes"
echo ""
echo "6. Vérifiez avec : pod --version"
echo ""
echo "💡 Conseil : Après avoir tapé votre mot de passe,"
echo "   appuyez sur ENTREE même si rien ne s'affiche !"

