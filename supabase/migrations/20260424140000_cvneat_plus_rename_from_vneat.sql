-- Repasse marque : vneat_* -> cvneat_* ; l’abonnement devient « −50 % sur les frais » (colonne sur commande renommée).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'vneat_plus_ends_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'cvneat_plus_ends_at'
  ) THEN
    ALTER TABLE public.users RENAME COLUMN vneat_plus_ends_at TO cvneat_plus_ends_at;
  END IF;
END $$;

COMMENT ON COLUMN public.users.cvneat_plus_ends_at IS 'Fin de période abonnement CVN''EAT Plus (remise 50% sur frais livraison si > now()).';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commandes' AND column_name = 'vneat_plus_delivery_applied'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commandes' AND column_name = 'cvneat_plus_half_delivery'
  ) THEN
    ALTER TABLE public.commandes RENAME COLUMN vneat_plus_delivery_applied TO cvneat_plus_half_delivery;
  END IF;
END $$;

COMMENT ON COLUMN public.commandes.cvneat_plus_half_delivery IS 'Avantage abonné : 50% des frais de livraison (moitié appliquée côté client, voir lib/cvneat-plus.js).';

-- Installs déjà partis sur noms vneat sans l’ancienne migration renommée : s’il manque la colonne cible, l’ajouter
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cvneat_plus_ends_at TIMESTAMPTZ;
ALTER TABLE public.commandes ADD COLUMN IF NOT EXISTS cvneat_plus_half_delivery BOOLEAN NOT NULL DEFAULT FALSE;
