-- Table des réclamations post-livraison
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- Détails de la réclamation
    complaint_type VARCHAR(50) NOT NULL CHECK (complaint_type IN ('food_quality', 'delivery_issue', 'missing_items', 'wrong_order', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Preuves et justifications
    photos JSONB DEFAULT '[]', -- URLs des photos uploadées
    evidence_description TEXT,
    
    -- Montant demandé
    requested_refund_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Statut de la réclamation
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')),
    
    -- Réponse admin
    admin_response TEXT,
    admin_decision VARCHAR(20) CHECK (admin_decision IN ('approve', 'reject', 'partial_refund')),
    final_refund_amount DECIMAL(10,2),
    admin_notes TEXT,
    
    -- Métadonnées de sécurité
    ip_address INET,
    user_agent TEXT,
    complaint_score INTEGER DEFAULT 0, -- Score de fiabilité (0-100)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Contraintes
    CONSTRAINT valid_refund_amount CHECK (requested_refund_amount > 0)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_complaints_order_id ON complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer_id ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_restaurant_id ON complaints(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);

-- Table pour tracker l'historique des réclamations par client (anti-fraude)
CREATE TABLE IF NOT EXISTS customer_complaint_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Statistiques
    total_complaints INTEGER DEFAULT 0,
    approved_complaints INTEGER DEFAULT 0,
    rejected_complaints INTEGER DEFAULT 0,
    total_refunded DECIMAL(10,2) DEFAULT 0,
    
    -- Score de confiance (0-100)
    trust_score INTEGER DEFAULT 100,
    
    -- Dernière réclamation
    last_complaint_date TIMESTAMP WITH TIME ZONE,
    
    -- Flags de sécurité
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(customer_id)
);

-- Table pour les preuves des réclamations
CREATE TABLE IF NOT EXISTS complaint_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    
    -- Type de preuve
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('photo', 'receipt', 'chat_log', 'other')),
    
    -- Fichier
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Description
    description TEXT,
    
    -- Métadonnées
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Validation admin
    is_validated BOOLEAN DEFAULT FALSE,
    validation_notes TEXT
);

-- Fonction pour valider la fenêtre de temps des réclamations
CREATE OR REPLACE FUNCTION validate_complaint_window()
RETURNS TRIGGER AS $$
DECLARE
    order_created_at TIMESTAMP WITH TIME ZONE;
    hours_diff NUMERIC;
BEGIN
    -- Récupérer la date de création de la commande
    SELECT created_at INTO order_created_at
    FROM orders 
    WHERE id = NEW.order_id;
    
    IF order_created_at IS NULL THEN
        RAISE EXCEPTION 'Commande non trouvée pour l''ID: %', NEW.order_id;
    END IF;
    
    -- Calculer la différence en heures
    hours_diff := EXTRACT(EPOCH FROM (NEW.created_at - order_created_at)) / 3600;
    
    -- Vérifier la fenêtre de temps (1h minimum, 48h maximum)
    IF hours_diff < 1 THEN
        RAISE EXCEPTION 'Réclamation trop tôt: minimum 1 heure après la livraison';
    END IF;
    
    IF hours_diff > 48 THEN
        RAISE EXCEPTION 'Réclamation trop tardive: maximum 48 heures après la livraison';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour l'historique des réclamations
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

-- Trigger pour valider la fenêtre de temps des réclamations
CREATE TRIGGER trigger_validate_complaint_window
    BEFORE INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION validate_complaint_window();

-- Trigger pour mettre à jour automatiquement l'historique
CREATE TRIGGER trigger_update_complaint_history
    AFTER INSERT OR UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_complaint_history();

-- RLS (Row Level Security)
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_complaint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_evidence ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view their own complaints"
    ON complaints FOR SELECT
    USING (auth.uid()::text = customer_id::text);

CREATE POLICY "Users can create their own complaints"
    ON complaints FOR INSERT
    WITH CHECK (auth.uid()::text = customer_id::text);

CREATE POLICY "Users can update their own pending complaints"
    ON complaints FOR UPDATE
    USING (auth.uid()::text = customer_id::text AND status = 'pending');

-- Admins peuvent voir toutes les réclamations
CREATE POLICY "Admins can view all complaints"
    ON complaints FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Restaurants peuvent voir les réclamations les concernant
CREATE POLICY "Restaurants can view their complaints"
    ON complaints FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM restaurants 
            WHERE restaurants.id = complaints.restaurant_id 
            AND restaurants.user_id::text = auth.uid()::text
        )
    );
