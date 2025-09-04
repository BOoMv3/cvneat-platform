-- Script pour corriger le rôle du livreur
-- À exécuter dans Supabase SQL Editor

-- Vérifier d'abord les utilisateurs existants
SELECT id, email, role, nom, prenom FROM users WHERE email LIKE '%livreur%' OR role = 'delivery';

-- Mettre à jour le rôle du livreur
UPDATE users 
SET role = 'delivery' 
WHERE email = 'livreur@cvneat.fr';

-- Vérifier que la mise à jour a fonctionné
SELECT id, email, role, nom, prenom FROM users WHERE email = 'livreur@cvneat.fr';

-- Si le livreur n'existe pas, le créer
INSERT INTO users (id, nom, prenom, email, password, telephone, adresse, code_postal, ville, role, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Dupont',
  'Jean',
  'livreur@cvneat.fr',
  'password123',
  '0123456789',
  '123 Rue des Livreurs',
  '75001',
  'Paris',
  'delivery',
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'delivery',
  nom = 'Dupont',
  prenom = 'Jean',
  telephone = '0123456789',
  adresse = '123 Rue des Livreurs',
  code_postal = '75001',
  ville = 'Paris';

-- Vérification finale
SELECT 'Utilisateurs avec rôle delivery:' as info;
SELECT id, email, role, nom, prenom FROM users WHERE role = 'delivery';
