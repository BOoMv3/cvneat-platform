-- Abonnement « CVN'Plus » (livraison offerte) — période stockée, lien Stripe
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vneat_plus_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.users.vneat_plus_ends_at IS 'Date fin de période d''abonnement CVN''Plus (livraison offerte si > now() et paiement actif côté Stripe géré par webhook).';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Customer Stripe (Customer Portal, abonnements).';

CREATE INDEX IF NOT EXISTS idx_users_vneat_plus_ends_at
  ON public.users (vneat_plus_ends_at)
  WHERE vneat_plus_ends_at IS NOT NULL;

ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS vneat_plus_delivery_applied BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.commandes.vneat_plus_delivery_applied IS 'Frais livraison mis à 0 grâce à l''abonnement CVN''Plus (hors code promo / fidélité).';
