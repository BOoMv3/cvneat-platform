-- Script pour corriger la table commandes pour utiliser des UUIDs
-- À exécuter dans Supabase SQL Editor

-- 1. Supprimer l'ancienne table commandes
DROP TABLE IF EXISTS commandes CASCADE;

-- 2. Créer une nouvelle table commandes avec UUIDs
CREATE TABLE commandes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    livreur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    statut VARCHAR(50) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee')),
    total DECIMAL(10,2) NOT NULL,
    frais_livraison DECIMAL(10,2) NOT NULL,
    adresse_livraison TEXT NOT NULL,
    note_livreur INTEGER,
    commentaire_livreur TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Créer les index pour les performances
CREATE INDEX idx_commandes_user_id ON commandes(user_id);
CREATE INDEX idx_commandes_restaurant_id ON commandes(restaurant_id);
CREATE INDEX idx_commandes_livreur_id ON commandes(livreur_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_created_at ON commandes(created_at);

-- 4. Activer RLS
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
CREATE POLICY "Users can view their own orders"
    ON commandes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own orders"
    ON commandes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own orders"
    ON commandes FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Restaurants can view their orders"
    ON commandes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = commandes.restaurant_id 
        AND restaurants.user_id = auth.uid()
    ));

CREATE POLICY "Restaurants can update their orders"
    ON commandes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM restaurants 
        WHERE restaurants.id = commandes.restaurant_id 
        AND restaurants.user_id = auth.uid()
    ));

CREATE POLICY "Admins can view all orders"
    ON commandes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
    ));

CREATE POLICY "Admins can update all orders"
    ON commandes FOR UPDATE
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

CREATE TRIGGER update_commandes_updated_at
    BEFORE UPDATE ON commandes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
