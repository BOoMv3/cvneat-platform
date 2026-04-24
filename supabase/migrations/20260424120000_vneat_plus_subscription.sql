-- Abonnement **CVN'EAT Plus** : période, customer Stripe, remise 50 % sur frais livraison
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cvneat_plus_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.users.cvneat_plus_ends_at IS 'Fin période abonnement CVN''EAT Plus (remise 50% sur frais si actif, webhook Stripe).';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Customer Stripe (portail, abonnements).';

CREATE INDEX IF NOT EXISTS idx_users_cvneat_plus_ends_at
  ON public.users (cvneat_plus_ends_at)
  WHERE cvneat_plus_ends_at IS NOT NULL;

ALTER TABLE public.commandes
  ADD COLUMN IF NOT EXISTS cvneat_plus_half_delivery BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.commandes.cvneat_plus_half_delivery IS 'Abonné : moitié des frais de livraison seulement (voir /lib/cvneat-plus.js).';
