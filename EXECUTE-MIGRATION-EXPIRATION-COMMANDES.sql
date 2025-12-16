-- ⚡ MIGRATION À EXÉCUTER DANS SUPABASE SQL EDITOR
-- Copiez-collez ce fichier dans Supabase Dashboard > SQL Editor et cliquez sur "Run"
-- Date: 2025-01-23
-- Description: Ajoute l'expiration automatique des commandes sans livreur (10 minutes)

-- 1. Ajouter une colonne pour stocker la date de demande de livraison
ALTER TABLE commandes 
ADD COLUMN IF NOT EXISTS delivery_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Mettre à jour les commandes existantes en 'en_attente' avec delivery_requested_at = created_at
UPDATE commandes 
SET delivery_requested_at = created_at 
WHERE delivery_requested_at IS NULL AND statut = 'en_attente';

-- 3. Créer une fonction pour annuler automatiquement les commandes sans livreur après 10 minutes
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

-- 4. Commentaire pour documenter la fonction
COMMENT ON FUNCTION cancel_orders_without_delivery() IS 'Annule automatiquement les commandes en attente sans livreur après 10 minutes';

-- 5. Créer un index pour améliorer les performances de la fonction
CREATE INDEX IF NOT EXISTS idx_commandes_delivery_requested_at 
ON commandes(delivery_requested_at) 
WHERE statut = 'en_attente' AND livreur_id IS NULL;

-- 6. Créer une fonction de nettoyage qui peut être appelée par pg_cron ou un job externe
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

-- 7. Commentaire pour documenter
COMMENT ON FUNCTION cleanup_expired_orders() IS 'Nettoie les commandes expirées sans livreur (appelée toutes les minutes par pg_cron ou job externe)';

-- ✅ Migration terminée !
-- Prochaines étapes:
-- 1. Vérifiez que la colonne delivery_requested_at existe dans la table commandes
-- 2. Configurez un cron job pour appeler /api/admin/cleanup-expired-orders toutes les minutes
-- 3. Testez le workflow: créez une commande et attendez 10 minutes sans livreur

