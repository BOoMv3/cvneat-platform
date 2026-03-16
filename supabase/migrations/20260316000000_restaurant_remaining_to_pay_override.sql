-- Permet de forcer le "reste à payer" pour un restaurant (ex. 99 Street Food)
-- Quand non NULL, la page Virements utilise cette valeur au lieu du calcul automatique.
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS remaining_to_pay_override DECIMAL(10,2) NULL;

COMMENT ON COLUMN restaurants.remaining_to_pay_override IS 'Si renseigné, montant affiché comme "reste à payer" à la place du calcul (pour corriger des incohérences).';
