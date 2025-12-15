#!/bin/bash

# Script pour réinitialiser le mot de passe de theo@cvneat.fr
# Utilise l'API admin (nécessite d'être connecté en tant qu'admin)

echo "🔐 Réinitialisation du mot de passe pour theo@cvneat.fr"
echo ""
echo "⚠️  Pour réinitialiser le mot de passe, vous avez deux options :"
echo ""
echo "OPTION 1 - Via l'interface admin (recommandé) :"
echo "  1. Connectez-vous en tant qu'admin sur https://cvneat.fr/admin/users"
echo "  2. Trouvez l'utilisateur theo@cvneat.fr"
echo "  3. Cliquez sur 'Réinitialiser le mot de passe'"
echo "  4. Le nouveau mot de passe sera affiché"
echo ""
echo "OPTION 2 - Via Supabase Dashboard :"
echo "  1. Allez sur https://supabase.com/dashboard"
echo "  2. Sélectionnez votre projet"
echo "  3. Allez dans Authentication > Users"
echo "  4. Recherchez theo@cvneat.fr"
echo "  5. Cliquez sur l'utilisateur > 'Reset Password'"
echo "  6. Un email sera envoyé à theo@cvneat.fr avec un lien de réinitialisation"
echo ""
echo "OPTION 3 - Via SQL (nécessite Supabase SQL Editor) :"
echo "  Exécutez ce script SQL dans Supabase SQL Editor :"
echo ""
cat << 'SQL'
-- Réinitialiser le mot de passe via Supabase Auth Admin API
-- Note: Les mots de passe sont hashés, on ne peut pas les récupérer
-- Il faut utiliser l'API Supabase Admin pour réinitialiser

-- Option A: Utiliser l'interface Supabase Dashboard (recommandé)
-- Authentication > Users > theo@cvneat.fr > Reset Password

-- Option B: Utiliser l'API via curl (nécessite SUPABASE_SERVICE_ROLE_KEY)
-- curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/admin/users' \
--   -H "apikey: YOUR_SERVICE_ROLE_KEY" \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{"email": "theo@cvneat.fr", "password": "NouveauMotDePasse123!"}'
SQL

