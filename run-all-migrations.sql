-- Script pour exécuter toutes les migrations
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Créer la table users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'restaurant', 'delivery')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Désactiver RLS temporairement
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 3. Créer l'utilisateur admin
INSERT INTO users (id, nom, prenom, email, password, telephone, adresse, code_postal, ville, role)
VALUES (
    gen_random_uuid(),
    'Admin',
    'CVNEAT',
    'admin@cvneat.com',
    'admin123',
    '0123456789',
    'Adresse Admin',
    '34000',
    'Montpellier',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- 4. Vérifier que l'admin a été créé
SELECT id, email, role FROM users WHERE email = 'admin@cvneat.com'; 