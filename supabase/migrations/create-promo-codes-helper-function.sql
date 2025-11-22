-- Fonction helper pour incrémenter le compteur d'utilisations
CREATE OR REPLACE FUNCTION increment_promo_code_uses(p_promo_code_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE promo_codes
    SET current_uses = current_uses + 1,
        updated_at = NOW()
    WHERE id = p_promo_code_id;
END;
$$ LANGUAGE plpgsql;

