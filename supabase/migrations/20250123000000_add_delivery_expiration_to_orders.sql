-- Migration pour ajouter l'expiration automatique des commandes sans livreur
-- Date: 2025-01-23

-- Ajouter une colonne pour stocker la date de demande de livraison (création de la commande)
-- Si aucun livreur n'accepte dans 10 minutes, la commande sera automatiquement annulée
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS delivery_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Mettre à jour les commandes existantes en 'en_attente' avec delivery_requested_at = created_at
UPDATE commandes 
SET delivery_requested_at = created_at 
WHERE delivery_requested_at IS NULL AND statut = 'en_attente';

-- Créer une fonction pour annuler automatiquement les commandes sans livreur après 10 minutes
CREATE OR REPLACE FUNCTION cancel_orders_without_delivery()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Annuler les commandes en 'en_attente' sans livreur assigné après 10 minutes
  UPDATE commandes
  SET 
    statut = 'annulee',
    updated_at = NOW()
  WHERE 
    statut = 'en_attente'
    AND livreur_id IS NULL
    AND payment_status IN ('paid', 'succeeded') -- Seulement les commandes payées
    AND delivery_requested_at IS NOT NULL
    AND delivery_requested_at < NOW() - INTERVAL '10 minutes';
END;
$$;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION cancel_orders_without_delivery() IS 'Annule automatiquement les commandes en attente sans livreur après 10 minutes';

-- Créer un index pour améliorer les performances de la fonction
CREATE INDEX IF NOT EXISTS idx_commandes_delivery_requested_at 
ON commandes(delivery_requested_at) 
WHERE statut = 'en_attente' AND livreur_id IS NULL;

-- Créer une fonction de nettoyage qui peut être appelée par pg_cron (si disponible)
-- ou par un job externe toutes les minutes
CREATE OR REPLACE FUNCTION cleanup_expired_orders()
RETURNS TABLE(cancelled_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Annuler les commandes expirées
  UPDATE commandes
  SET 
    statut = 'annulee',
    updated_at = NOW()
  WHERE 
    statut = 'en_attente'
    AND livreur_id IS NULL
    AND payment_status IN ('paid', 'succeeded')
    AND delivery_requested_at IS NOT NULL
    AND delivery_requested_at < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$;

-- Commentaire pour documenter
COMMENT ON FUNCTION cleanup_expired_orders() IS 'Nettoie les commandes expirées sans livreur (appelée toutes les minutes par pg_cron)';

