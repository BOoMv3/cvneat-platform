-- Ticket unique Coupe du Monde par commande (tirage au sort)
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS world_cup_ticket_code text;

CREATE UNIQUE INDEX IF NOT EXISTS commandes_world_cup_ticket_code_unique
  ON commandes (world_cup_ticket_code)
  WHERE world_cup_ticket_code IS NOT NULL;

COMMENT ON COLUMN commandes.world_cup_ticket_code IS
  'Code unique tirage Coupe du Monde (ex: CDM-A1B2C3D4), attribué à la validation du paiement.';
