-- Colonnes pour la stratégie "Boost ventes" (prix boutique / commission réduite)
-- Les partenaires qui acceptent sont enregistrés ici
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS strategie_boost_acceptee BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS strategie_boost_accepted_at TIMESTAMPTZ;
