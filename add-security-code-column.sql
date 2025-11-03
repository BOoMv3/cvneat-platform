-- Script SQL pour ajouter le champ security_code à la table commandes
-- À exécuter dans Supabase SQL Editor

ALTER TABLE commandes
ADD COLUMN IF NOT EXISTS security_code VARCHAR(10);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN commandes.security_code IS 'Code de sécurité à 6 chiffres pour valider la livraison avec le livreur';

-- Optionnel: Créer un index si nécessaire pour les recherches
-- CREATE INDEX IF NOT EXISTS idx_commandes_security_code ON commandes(security_code);

