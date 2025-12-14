-- Ajouter les colonnes pour stocker les codes promo dans les commandes
-- À exécuter dans Supabase SQL Editor

-- Ajouter promo_code_id si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

-- Ajouter promo_code (le code en texte) si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);

-- Ajouter discount_amount (montant de la réduction appliquée) si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Commentaires pour la documentation
COMMENT ON COLUMN commandes.promo_code_id IS 'ID du code promo utilisé (référence vers promo_codes)';
COMMENT ON COLUMN commandes.promo_code IS 'Code promo utilisé (ex: ROULETTEABC123)';
COMMENT ON COLUMN commandes.discount_amount IS 'Montant de la réduction appliquée avec le code promo';

-- Créer un index pour améliorer les recherches
CREATE INDEX IF NOT EXISTS idx_commandes_promo_code_id ON commandes(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_commandes_promo_code ON commandes(promo_code);
