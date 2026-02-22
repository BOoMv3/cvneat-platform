-- Réduction prévue par l'admin pour la stratégie "Boost ventes"
-- Le partenaire ne choisit pas : c'est l'admin qui définit (-20, -17, -13, -9, 0 ou NULL)
-- NULL = non configuré, le partenaire doit contacter l'admin
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS strategie_boost_reduction_pct INTEGER DEFAULT NULL;
