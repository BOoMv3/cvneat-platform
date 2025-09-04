-- Ajouter la colonne livreur_id à la table commandes
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne livreur_id si elle n'existe pas
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur_id UUID REFERENCES users(id);

-- Ajouter la colonne frais_livraison si elle n'existe pas
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS frais_livraison DECIMAL(10,2) DEFAULT 2.50;

-- Ajouter la colonne montant_total si elle n'existe pas
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant_total DECIMAL(10,2) DEFAULT 0.00;

-- Vérifier la structure de la table
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
ORDER BY ordinal_position;
