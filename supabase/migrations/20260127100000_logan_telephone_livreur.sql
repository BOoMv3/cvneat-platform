-- Ajouter le numéro de Logan (livreur) pour que les clients voient son téléphone sur la page de suivi de commande
UPDATE users
SET telephone = '0674981005'
WHERE role = 'delivery'
  AND (TRIM(LOWER(COALESCE(prenom, ''))) = 'logan' OR TRIM(LOWER(COALESCE(nom, ''))) = 'logan');
