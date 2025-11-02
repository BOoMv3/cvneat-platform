-- Script SQL pour ajouter le champ ready_for_delivery à la table commandes
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne ready_for_delivery si elle n'existe pas
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS ready_for_delivery BOOLEAN DEFAULT false;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_commandes_ready_for_delivery 
ON commandes(ready_for_delivery) 
WHERE ready_for_delivery = true;

-- Commentaire pour documentation
COMMENT ON COLUMN commandes.ready_for_delivery IS 
'Indicateur que la commande est prête pour la livraison. false = restaurant en préparation, true = prête pour livreur';

