-- ========================================
-- SCRIPT D'INSTALLATION SIMPLIFIÉ
-- ========================================
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Créer les tables
-- ========================================

-- 1.1 Table des réclamations
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Détails de la réclamation
    complaint_type VARCHAR(50) NOT NULL CHECK (complaint_type IN ('food_quality', 'delivery_issue', 'missing_items', 'wrong_order', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requested_refund_amount DECIMAL(10,2),
    final_refund_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'partially_approved')),
    
    -- Preuves
    evidence_images JSONB,
    
    -- Anti-fraude et historique
    customer_trust_score INTEGER DEFAULT 100,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_refund_amount CHECK (requested_refund_amount > 0)
);

-- 1.2 Table pour l'historique des réclamations client
CREATE TABLE IF NOT EXISTS customer_complaint_history (
    customer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_complaints INTEGER DEFAULT 0,
    approved_complaints INTEGER DEFAULT 0,
    rejected_complaints INTEGER DEFAULT 0,
    total_refunded DECIMAL(10,2) DEFAULT 0.00,
    last_complaint_date TIMESTAMP WITH TIME ZONE,
    trust_score INTEGER DEFAULT 100,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1.3 Table pour les preuves de réclamation
CREATE TABLE IF NOT EXISTS complaint_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 1.4 Table pour les feedbacks clients
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
    issue_type VARCHAR(50),
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

-- ÉTAPE 2: Créer les index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_restaurant_id ON complaints(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaint_evidence_complaint_id ON complaint_evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_order_id ON order_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_customer_id ON order_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_restaurant_id ON order_feedback(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_feedback_had_issues ON order_feedback(had_issues) WHERE had_issues = TRUE;

-- ÉTAPE 3: Créer les fonctions
-- ========================================

-- 3.1 Fonction pour valider la fenêtre de temps des réclamations
CREATE OR REPLACE FUNCTION validate_complaint_window()
RETURNS TRIGGER AS $$
DECLARE
    order_created_at TIMESTAMP WITH TIME ZONE;
    order_status TEXT;
BEGIN
    -- Récupérer la date de création et le statut de la commande
    SELECT created_at, status INTO order_created_at, order_status
    FROM orders 
    WHERE id = NEW.order_id;
    
    IF order_created_at IS NULL THEN
        RAISE EXCEPTION 'Commande non trouvée pour l''ID: %', NEW.order_id;
    END IF;

    IF order_status != 'delivered' THEN
        RAISE EXCEPTION 'La réclamation ne peut être faite que pour une commande livrée.';
    END IF;
    
    -- Calculer la différence en heures
    DECLARE
        hours_diff NUMERIC;
    BEGIN
        hours_diff := EXTRACT(EPOCH FROM (NEW.created_at - order_created_at)) / 3600;
        
        -- Vérifier la fenêtre de temps (1h minimum, 48h maximum)
        IF hours_diff < 1 THEN
            RAISE EXCEPTION 'Réclamation trop tôt: minimum 1 heure après la livraison';
        END IF;
        
        IF hours_diff > 48 THEN
            RAISE EXCEPTION 'Réclamation trop tardive: maximum 48 heures après la livraison';
        END IF;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Fonction pour mettre à jour l'historique des réclamations
CREATE OR REPLACE FUNCTION update_customer_complaint_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les statistiques du client
    INSERT INTO customer_complaint_history (customer_id, total_complaints, last_complaint_date)
    VALUES (NEW.customer_id, 1, NEW.created_at)
    ON CONFLICT (customer_id) DO UPDATE SET
        total_complaints = customer_complaint_history.total_complaints + 1,
        last_complaint_date = NEW.created_at,
        updated_at = NOW();
    
    -- Si la réclamation est approuvée, mettre à jour les stats
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        UPDATE customer_complaint_history SET
            approved_complaints = approved_complaints + 1,
            total_refunded = total_refunded + COALESCE(NEW.final_refund_amount, NEW.requested_refund_amount),
            updated_at = NOW()
        WHERE customer_id = NEW.customer_id;
    END IF;
    
    -- Si la réclamation est rejetée, mettre à jour les stats
    IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
        UPDATE customer_complaint_history SET
            rejected_complaints = rejected_complaints + 1,
            updated_at = NOW()
        WHERE customer_id = NEW.customer_id;
    END IF;
    
    -- Calculer le score de confiance
    UPDATE customer_complaint_history SET
        trust_score = GREATEST(0, LEAST(100, 
            100 - (rejected_complaints * 20) + (approved_complaints * 5)
        )),
        is_flagged = (rejected_complaints >= 3 OR trust_score < 30),
        flag_reason = CASE 
            WHEN rejected_complaints >= 3 THEN 'Trop de réclamations rejetées'
            WHEN trust_score < 30 THEN 'Score de confiance trop bas'
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE customer_id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.3 Fonction pour convertir un feedback en réclamation si nécessaire
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

-- ÉTAPE 4: Créer les triggers
-- ========================================

-- 4.1 Trigger pour valider la fenêtre de temps
DROP TRIGGER IF EXISTS trigger_validate_complaint_window ON complaints;
CREATE TRIGGER trigger_validate_complaint_window
    BEFORE INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION validate_complaint_window();

-- 4.2 Trigger pour mettre à jour l'historique
DROP TRIGGER IF EXISTS trigger_update_complaint_history ON complaints;
CREATE TRIGGER trigger_update_complaint_history
    AFTER INSERT OR UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_complaint_history();

-- 4.3 Trigger pour convertir feedback en réclamation
DROP TRIGGER IF EXISTS trigger_convert_feedback_to_complaint ON order_feedback;
CREATE TRIGGER trigger_convert_feedback_to_complaint
    AFTER INSERT ON order_feedback
    FOR EACH ROW
    EXECUTE FUNCTION convert_feedback_to_complaint();

-- ÉTAPE 5: Activer RLS
-- ========================================

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_complaint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_feedback ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 6: Créer les politiques RLS SIMPLIFIÉES
-- ========================================

-- 6.1 Politiques pour complaints
DROP POLICY IF EXISTS "Customers can create complaints for their orders" ON complaints;
DROP POLICY IF EXISTS "Customers can view their own complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can update any complaint" ON complaints;

CREATE POLICY "Customers can create complaints for their orders"
    ON complaints FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own complaints"
    ON complaints FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all complaints"
    ON complaints FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update any complaint"
    ON complaints FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 6.2 Politiques pour customer_complaint_history
DROP POLICY IF EXISTS "Customers can view their own complaint history" ON customer_complaint_history;
DROP POLICY IF EXISTS "Admins can view all complaint history" ON customer_complaint_history;

CREATE POLICY "Customers can view their own complaint history"
    ON customer_complaint_history FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all complaint history"
    ON customer_complaint_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 6.3 Politiques pour complaint_evidence
DROP POLICY IF EXISTS "Customers can insert their own complaint evidence" ON complaint_evidence;
DROP POLICY IF EXISTS "Customers can view their own complaint evidence" ON complaint_evidence;
DROP POLICY IF EXISTS "Admins can view all complaint evidence" ON complaint_evidence;

CREATE POLICY "Customers can insert their own complaint evidence"
    ON complaint_evidence FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM complaints WHERE id = complaint_id AND customer_id = auth.uid()));

CREATE POLICY "Customers can view their own complaint evidence"
    ON complaint_evidence FOR SELECT
    USING (EXISTS (SELECT 1 FROM complaints WHERE id = complaint_id AND customer_id = auth.uid()));

CREATE POLICY "Admins can view all complaint evidence"
    ON complaint_evidence FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 6.4 Politiques pour order_feedback
DROP POLICY IF EXISTS "Customers can create feedback for their orders" ON order_feedback;
DROP POLICY IF EXISTS "Customers can view their own feedback" ON order_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON order_feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON order_feedback;

CREATE POLICY "Customers can create feedback for their orders"
    ON order_feedback FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own feedback"
    ON order_feedback FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all feedback"
    ON order_feedback FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update feedback"
    ON order_feedback FOR UPDATE
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ÉTAPE 7: Vérification finale
-- ========================================

SELECT 'Installation terminée avec succès !' as status;
SELECT COUNT(*) as complaints_table_created FROM information_schema.tables WHERE table_name = 'complaints';
SELECT COUNT(*) as feedback_table_created FROM information_schema.tables WHERE table_name = 'order_feedback';
SELECT COUNT(*) as history_table_created FROM information_schema.tables WHERE table_name = 'customer_complaint_history';
SELECT COUNT(*) as evidence_table_created FROM information_schema.tables WHERE table_name = 'complaint_evidence';
SELECT COUNT(*) as triggers_created FROM information_schema.triggers WHERE trigger_name LIKE '%complaint%';
