-- Vérifier les rôles valides dans la table users
SELECT DISTINCT role FROM users;

-- Vérifier la contrainte de rôle
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'users_role_check';
