-- Minimum de commande + colonnes de notation restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS commande_min numeric(10,2) NOT NULL DEFAULT 15.00;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS rating numeric(3,1) NOT NULL DEFAULT 0;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.restaurants.commande_min IS 'Montant minimum de commande (sous-total articles) en euros';
COMMENT ON COLUMN public.restaurants.rating IS 'Note moyenne (1-5), synchronisée depuis reviews';
COMMENT ON COLUMN public.restaurants.reviews_count IS 'Nombre d''avis clients';

-- order_feedback : order_id était BIGINT -> orders, alors que l'app utilise commandes (UUID)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_feedback' AND column_name = 'order_id'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE public.order_feedback DROP CONSTRAINT IF EXISTS order_feedback_order_id_fkey;
    ALTER TABLE public.order_feedback DROP CONSTRAINT IF EXISTS unique_order_feedback;
    ALTER TABLE public.order_feedback DROP COLUMN order_id;
    ALTER TABLE public.order_feedback
      ADD COLUMN order_id uuid NOT NULL REFERENCES public.commandes(id) ON DELETE CASCADE;
    ALTER TABLE public.order_feedback
      ADD CONSTRAINT unique_order_feedback UNIQUE (order_id, customer_id);
  END IF;
END $$;

-- Recalcul notes depuis reviews existantes
UPDATE public.restaurants r
SET
  rating = COALESCE(agg.avg_rating, 0),
  reviews_count = COALESCE(agg.cnt, 0)
FROM (
  SELECT
    restaurant_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)::integer AS cnt
  FROM public.reviews
  GROUP BY restaurant_id
) agg
WHERE r.id = agg.restaurant_id;
