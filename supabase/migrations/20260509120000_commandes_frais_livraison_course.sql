-- Base « course » pour rémunération livreur / commission livraison (non réduite par CVNeat Plus −50%).
-- frais_livraison = montant facturé au client pour la livraison (peut être divisé par 2 pour les abonnés).
ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS frais_livraison_course DECIMAL(10, 2);

COMMENT ON COLUMN public.commandes.frais_livraison_course IS
  'Tarif course utilisé pour commission livraison et gain livreur (avantage abonné ne réduit pas cette base). NULL = utiliser frais_livraison (anciennes commandes).';
