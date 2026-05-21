-- Créneaux de livraison souhaités (client) + validation restaurant

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS delivery_slot_type VARCHAR(16) DEFAULT 'asap',
  ADD COLUMN IF NOT EXISTS delivery_slot_status VARCHAR(24) DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS delivery_slot_requested_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_requested_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_confirmed_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_confirmed_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_proposed_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_proposed_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_slot_partner_note TEXT,
  ADD COLUMN IF NOT EXISTS delivery_slot_responded_at TIMESTAMPTZ;

COMMENT ON COLUMN commandes.delivery_slot_type IS 'asap | window';
COMMENT ON COLUMN commandes.delivery_slot_status IS 'pending | confirmed | alternative | fallback_asap';
COMMENT ON COLUMN commandes.delivery_slot_requested_start IS 'Début créneau demandé par le client (fenêtre 30 min)';
COMMENT ON COLUMN commandes.delivery_slot_confirmed_start IS 'Créneau validé par le restaurant (affiché livreur + client)';
