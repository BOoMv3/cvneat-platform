-- Table pour exclure certaines commandes du calcul "reste à payer" (doublons, erreurs, etc.)
-- Utilisé par la page Admin > Paiements / Virements.
CREATE TABLE IF NOT EXISTS commandes_payout_exclude (
  commande_id UUID PRIMARY KEY REFERENCES commandes(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE commandes_payout_exclude IS 'Commandes exclues du calcul des paiements dus aux restaurants (doublons, erreurs de saisie, etc.)';
