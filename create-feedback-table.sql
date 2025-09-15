-- Table pour les feedbacks clients (approche positive)
CREATE TABLE IF NOT EXISTS order_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Évaluations (1-5 étoiles)
    overall_satisfaction INTEGER NOT NULL CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
    food_quality INTEGER CHECK (food_quality >= 1 AND food_quality <= 5),
    delivery_speed INTEGER CHECK (delivery_speed >= 1 AND delivery_speed <= 5),
    delivery_quality INTEGER CHECK (delivery_quality >= 1 AND delivery_quality <= 5),
    restaurant_rating INTEGER CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
    
    -- Commentaires
    comment TEXT,
    
    -- Problèmes (approche proactive)
    had_issues BOOLEAN DEFAULT FALSE,
    issue_type VARCHAR(50), -- 'food_quality', 'delivery_issue', 'missing_items', 'wrong_order', 'other'
    issue_description TEXT,
    
    -- Conversion en réclamation
    converted_to_complaint BOOLEAN DEFAULT FALSE,
    complaint_id UUID REFERENCES complaints(id),
    
    -- Dates
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Contraintes
    CONSTRAINT unique_order_feedback UNIQUE (order_id, customer_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_order_feedback_order_id ON order_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_customer_id ON order_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_restaurant_id ON order_feedback(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_had_issues ON order_feedback(had_issues) WHERE had_issues = TRUE;

-- RLS (Row Level Security)
ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;

-- Policies pour order_feedback
CREATE POLICY "Customers can create feedback for their orders"
    ON order_feedback FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own feedback"
    ON order_feedback FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Restaurants can view feedback for their orders"
    ON order_feedback FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM orders 
        WHERE orders.id = order_feedback.order_id 
        AND orders.restaurant_id = (
            SELECT id FROM restaurants 
            WHERE restaurants.id = orders.restaurant_id
            AND EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.role = 'restaurant'
                AND users.restaurant_id = restaurants.id
            )
        )
    ));

CREATE POLICY "Admins can view all feedback"
    ON order_feedback FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update feedback"
    ON order_feedback FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Fonction pour convertir un feedback en réclamation si nécessaire
CREATE OR REPLACE FUNCTION convert_feedback_to_complaint()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le client a signalé des problèmes dans son feedback
    IF NEW.had_issues = TRUE AND NEW.issue_description IS NOT NULL AND NEW.converted_to_complaint = FALSE THEN
        -- Créer une réclamation automatiquement
        INSERT INTO complaints (
            order_id,
            customer_id,
            restaurant_id,
            complaint_type,
            title,
            description,
            status,
            created_at
        ) VALUES (
            NEW.order_id,
            NEW.customer_id,
            NEW.restaurant_id,
            COALESCE(NEW.issue_type, 'other'),
            'Réclamation issue du feedback client',
            NEW.issue_description,
            'pending',
            NEW.submitted_at
        );
        
        -- Marquer le feedback comme converti
        UPDATE order_feedback 
        SET converted_to_complaint = TRUE,
            complaint_id = (SELECT id FROM complaints WHERE order_id = NEW.order_id ORDER BY created_at DESC LIMIT 1)
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Feedback converti en réclamation pour la commande %', NEW.order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la conversion automatique
CREATE TRIGGER trigger_convert_feedback_to_complaint
    AFTER INSERT ON order_feedback
    FOR EACH ROW
    EXECUTE FUNCTION convert_feedback_to_complaint();
