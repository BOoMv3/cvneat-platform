-- RLS sur commandes_payout_exclude : les admins peuvent lire (page Paiements / Virements)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commandes_payout_exclude') THEN
    ALTER TABLE commandes_payout_exclude ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can view payout exclusions" ON commandes_payout_exclude;
    CREATE POLICY "Admins can view payout exclusions"
      ON commandes_payout_exclude FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id::text = auth.uid()::text
          AND users.role = 'admin'
        )
      );
  END IF;
END $$;
