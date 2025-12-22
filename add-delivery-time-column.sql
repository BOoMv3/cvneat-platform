-- Script pour ajouter la colonne delivery_time à la table commandes
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne delivery_time (temps de livraison en minutes)
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS delivery_time INTEGER;

-- Vérifier que la colonne a été ajoutée
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'commandes' 
  AND table_schema = 'public'
  AND column_name = 'delivery_time';

