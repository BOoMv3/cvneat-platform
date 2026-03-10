-- Ajout SIRET et raison sociale pour les livreurs (facturation)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT;

COMMENT ON COLUMN users.siret IS 'SIRET du livreur (pour factures)';
COMMENT ON COLUMN users.legal_name IS 'Raison sociale / nom pour facturation (ex: LEGALLIARD Dany)';

-- Mettre à jour le livreur Dany (LEGALLIARD) avec le SIRET fourni
UPDATE users
SET siret = '92518478000029',
    legal_name = 'LEGALLIARD Dany'
WHERE role IN ('delivery', 'livreur')
  AND (prenom ILIKE 'dany%' OR (prenom ILIKE '%dany%' AND nom ILIKE '%gall%'));
