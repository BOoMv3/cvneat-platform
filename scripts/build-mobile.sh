#!/bin/bash

# Ce script retire temporairement les exports dynamiques des routes API
# car ils sont incompatibles avec l'export statique

echo "🔧 Préparation du build mobile..."

# Sauvegarder les fichiers avec force-dynamic
API_FILES=$(grep -rl "force-dynamic" app/api/ 2>/dev/null || true)

if [ -n "$API_FILES" ]; then
  echo "📦 Fichiers API avec force-dynamic trouvés:"
  echo "$API_FILES"
  
  # Commenter temporairement les exports force-dynamic
  for file in $API_FILES; do
    echo "  - Modification: $file"
    sed -i.bak 's/export const dynamic = .force-dynamic.;/\/\/ MOBILE_BUILD: export const dynamic = "force-dynamic";/' "$file"
  done
fi

echo "🏗️ Build en cours..."

# Faire le build avec BUILD_MOBILE=true
BUILD_MOBILE=true npm run build

BUILD_RESULT=$?

# Restaurer les fichiers originaux
if [ -n "$API_FILES" ]; then
  echo "♻️ Restauration des fichiers originaux..."
  for file in $API_FILES; do
    if [ -f "${file}.bak" ]; then
      mv "${file}.bak" "$file"
    fi
  done
fi

if [ $BUILD_RESULT -eq 0 ]; then
  echo "✅ Build mobile terminé avec succès!"
  echo ""
  echo "📱 Prochaine étape: Synchroniser avec Capacitor"
  echo "   npx cap sync ios"
  echo "   npx cap sync android"
else
  echo "❌ Erreur lors du build mobile"
  exit 1
fi
