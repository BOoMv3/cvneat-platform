-- ⚡ COMMANDE À EXÉCUTER IMMÉDIATEMENT DANS SUPABASE SQL EDITOR
-- Copiez-collez cette commande dans Supabase Dashboard > SQL Editor et cliquez sur "Run"

ALTER TABLE menus
ALTER COLUMN image_url TYPE TEXT;

-- ✅ Après exécution, vous pourrez enregistrer des images base64 sans limite de taille.

