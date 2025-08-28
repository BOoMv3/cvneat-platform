-- Script pour corriger l'accès admin
-- Exécutez ce script dans votre base Supabase

-- 1. Désactiver temporairement RLS pour les admins
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Ou créer une politique admin qui permet tout
CREATE POLICY "Admins can access all users"
    ON users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 3. Vérifier que l'utilisateur admin existe
SELECT id, email, role FROM users WHERE email = 'admin@cvneat.com';

-- 4. Si l'utilisateur n'existe pas, le créer
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