CREATE OR REPLACE FUNCTION validate_promo_code(
    p_code VARCHAR,
    p_user_id UUID,
    p_order_amount DECIMAL,
    p_restaurant_id UUID DEFAULT NULL,
    p_is_first_order BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    valid BOOLEAN,
    discount_amount DECIMAL,
    message TEXT,
    promo_code_id UUID
) AS $$
DECLARE
    v_promo promo_codes%ROWTYPE;
    v_user_uses INTEGER;
    v_discount DECIMAL;
    v_wheel_win_user_id UUID;
BEGIN
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE code = UPPER(TRIM(p_code))
      AND is_active = TRUE
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW());
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Code promo invalide ou expiré'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF UPPER(TRIM(p_code)) LIKE 'ROULETTE%' THEN
        SELECT user_id INTO v_wheel_win_user_id
        FROM wheel_wins
        WHERE promo_code = UPPER(TRIM(p_code))
          AND used_at IS NULL
          AND valid_until >= NOW()
        LIMIT 1;
        
        IF v_wheel_win_user_id IS NOT NULL THEN
            IF p_user_id IS NULL OR p_user_id != v_wheel_win_user_id THEN
                RETURN QUERY SELECT FALSE, 0::DECIMAL, 
                    'Ce code promo est personnel et ne peut être utilisé que par son propriétaire'::TEXT, 
                    NULL::UUID;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    IF p_order_amount < v_promo.min_order_amount THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 
            format('Montant minimum de commande requis: %s€', v_promo.min_order_amount)::TEXT,
            NULL::UUID;
        RETURN;
    END IF;
    
    IF v_promo.restaurant_id IS NOT NULL AND v_promo.restaurant_id != p_restaurant_id THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo n''est pas valable pour ce restaurant'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_promo.first_order_only AND NOT p_is_first_order THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo est réservé à votre première commande'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
        RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Ce code promo a atteint son nombre maximum d''utilisations'::TEXT, NULL::UUID;
        RETURN;
    END IF;
    
    IF p_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_user_uses
        FROM promo_code_usage
        WHERE promo_code_id = v_promo.id
          AND user_id = p_user_id;
        
        IF v_user_uses >= v_promo.max_uses_per_user THEN
            RETURN QUERY SELECT FALSE, 0::DECIMAL, 'Vous avez déjà utilisé ce code promo'::TEXT, NULL::UUID;
            RETURN;
        END IF;
    END IF;
    
    CASE v_promo.discount_type
        WHEN 'percentage' THEN
            v_discount := (p_order_amount * v_promo.discount_value / 100);
            IF v_promo.max_discount_amount IS NOT NULL THEN
                v_discount := LEAST(v_discount, v_promo.max_discount_amount);
            END IF;
        WHEN 'fixed' THEN
            v_discount := LEAST(v_promo.discount_value, p_order_amount);
        WHEN 'free_delivery' THEN
            v_discount := 0;
        ELSE
            v_discount := 0;
    END CASE;
    
    RETURN QUERY SELECT TRUE, v_discount, 'Code promo valide'::TEXT, v_promo.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_promo_code IS 'Valide un code promo et calcule la réduction. Les codes ROULETTE sont personnels et ne peuvent être utilisés que par leur propriétaire.';
