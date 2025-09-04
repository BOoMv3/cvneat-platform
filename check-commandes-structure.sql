-- Vérifier la structure de la table commandes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'commandes' 
ORDER BY ordinal_position;

-- Vérifier les contraintes de la table commandes
SELECT conname, contype, consrc
FROM pg_constraint 
WHERE conrelid = 'commandes'::regclass;

-- Vérifier les données existantes
SELECT COUNT(*) as total_commandes FROM commandes;
SELECT statut, COUNT(*) as count FROM commandes GROUP BY statut;
