#!/bin/bash

# Script pour installer Ruby récent et CocoaPods

echo "🍎 Installation de Ruby et CocoaPods..."
echo ""

# Vérifier Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew n'est pas installé"
    echo "   Installez Homebrew d'abord :"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew est installé"
echo ""

# Vérifier la version actuelle de Ruby
CURRENT_RUBY=$(ruby --version | cut -d' ' -f2)
echo "📊 Version Ruby actuelle : $CURRENT_RUBY"
echo ""

# Vérifier si Ruby est déjà >= 3.1
if ruby -e "exit (Gem::Version.new('$CURRENT_RUBY') >= Gem::Version.new('3.1.0'))" 2>/dev/null; then
    echo "✅ Ruby est déjà à jour (>= 3.1.0)"
else
    echo "⚠️  Ruby est trop ancien. Installation de Ruby 3.3.0..."
    echo ""
    
    # Installer Ruby via Homebrew
    echo "📦 Installation de Ruby (cela peut prendre 5-10 minutes)..."
    brew install ruby
    
    # Ajouter Ruby au PATH
    RUBY_PATH="/opt/homebrew/opt/ruby/bin"
    if [[ ":$PATH:" != *":$RUBY_PATH:"* ]]; then
        echo ""
        echo "🔧 Ajout de Ruby au PATH..."
        echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
        echo "✅ Ruby ajouté au PATH"
    fi
fi

echo ""
echo "📊 Nouvelle version de Ruby :"
ruby --version

# Vérifier si CocoaPods est déjà installé
if command -v pod &> /dev/null; then
    VERSION=$(pod --version)
    echo ""
    echo "✅ CocoaPods est déjà installé (version $VERSION)"
    exit 0
fi

echo ""
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
    echo "⚠️  Installation terminée. Vérifiez avec : pod --version"
    echo ""
    echo "💡 Si ça ne marche pas :"
    echo "   1. Fermez et rouvrez votre terminal"
    echo "   2. Tapez : pod --version"
fi

