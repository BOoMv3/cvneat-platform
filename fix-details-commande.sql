-- Script pour corriger la table details_commande pour être compatible avec les UUIDs
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne table details_commande
DROP TABLE IF EXISTS details_commande;

-- 2. Créer une nouvelle table details_commande compatible UUID
CREATE TABLE details_commande (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    plat_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    quantite INTEGER NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Créer les index pour les performances
CREATE INDEX idx_details_commande_commande_id ON details_commande(commande_id);
CREATE INDEX idx_details_commande_plat_id ON details_commande(plat_id);

-- 4. Activer RLS
ALTER TABLE details_commande ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
CREATE POLICY "Users can view their own order details"
    ON details_commande FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM commandes 
        WHERE commandes.id = details_commande.commande_id 
        AND commandes.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert order details for their own orders"
    ON details_commande FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM commandes 
        WHERE commandes.id = details_commande.commande_id 
        AND commandes.user_id = auth.uid()
    ));

CREATE POLICY "Admins can view all order details"
    ON details_commande FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ));

-- 6. Créer le trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_details_commande_updated_at
    BEFORE UPDATE ON details_commande
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
