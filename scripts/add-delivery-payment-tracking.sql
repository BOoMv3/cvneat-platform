-- Script pour ajouter le suivi des paiements aux livreurs
-- À exécuter dans Supabase SQL Editor

-- 1. Ajouter une colonne pour marquer quand les gains ont été payés au livreur
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS livreur_paid_at TIMESTAMP WITH TIME ZONE;

-- 2. Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_commandes_livreur_paid 
ON commandes(livreur_id, livreur_paid_at) 
WHERE livreur_paid_at IS NOT NULL;

-- 3. Ajouter un commentaire
COMMENT ON COLUMN commandes.livreur_paid_at IS 'Date à laquelle les gains de cette commande ont été payés au livreur';

-- 4. Vérifier la structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'commandes' 
AND column_name = 'livreur_paid_at';

