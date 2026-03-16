-- Passer Dorian (dorian.ledluz@gmail.com) en compte livreur
-- Exécuter dans Supabase → SQL Editor

UPDATE users
SET role = 'delivery'
WHERE email = 'dorian.ledluz@gmail.com';

-- Vérification
SELECT id, email, prenom, nom, role FROM users WHERE email = 'dorian.ledluz@gmail.com';
