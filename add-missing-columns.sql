-- SCRIPT POUR AJOUTER LES COLONNES MANQUANTES À LA TABLE COMMANDES
-- À exécuter dans Supabase SQL Editor

-- 1. AJOUTER LA COLONNE PREPARATION_TIME
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS preparation_time INTEGER;

-- 2. AJOUTER AUTRES COLONNES POTENTIELLEMENT MANQUANTES
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);

-- 3. VÉRIFIER QUE LES COLONNES ONT ÉTÉ AJOUTÉES
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name IN ('preparation_time', 'accepted_at', 'rejected_at', 'ready_at', 'rejection_reason', 'accepted_by')
ORDER BY column_name;
