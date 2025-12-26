-- Script SQL pour enregistrer le paiement de 40€ à theo@cvneat.fr (livreur)
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier que Théo existe et récupérer son ID
SELECT 
    id,
    nom,
    prenom,
    email,
    role
FROM users
WHERE email = 'theo@cvneat.fr'
  AND role = 'delivery';

-- ÉTAPE 2: Vérifier l'état actuel avant le paiement
-- (Commandes non payées et montant dû)
SELECT 
    u.email,
    u.nom,
    u.prenom,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL), 0) as montant_non_paye
FROM users u
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
GROUP BY u.email, u.nom, u.prenom;

-- ÉTAPE 3: Créer la table delivery_transfers si elle n'existe pas
CREATE TABLE IF NOT EXISTS delivery_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_name TEXT NOT NULL,
  delivery_email TEXT NOT NULL,
  
  -- Détails du virement
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT, -- Numéro de référence du virement bancaire
  notes TEXT, -- Notes additionnelles
  
  -- Période couverte par ce virement (optionnel)
  period_start DATE,
  period_end DATE,
  
  -- Statut
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Métadonnées
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_delivery_transfers_delivery_id ON delivery_transfers(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_transfers_transfer_date ON delivery_transfers(transfer_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_transfers_status ON delivery_transfers(status);

-- ÉTAPE 4: Enregistrer le paiement de 40€ à Théo
-- On va marquer les commandes non payées comme payées jusqu'à ce que le total atteigne 40€
DO $$
DECLARE
    theo_id UUID;
    theo_nom TEXT;
    theo_prenom TEXT;
    montant_restant DECIMAL(10,2) := 40.00;
    total_marque DECIMAL(10,2) := 0;
    transfer_id UUID;
BEGIN
    -- Récupérer l'ID de Théo
    SELECT id, nom, prenom INTO theo_id, theo_nom, theo_prenom
    FROM users
    WHERE email = 'theo@cvneat.fr'
      AND role = 'delivery'
    LIMIT 1;
    
    IF theo_id IS NULL THEN
        RAISE EXCEPTION 'Livreur theo@cvneat.fr non trouvé';
    END IF;
    
    -- Créer l'enregistrement de paiement
    INSERT INTO delivery_transfers (
        delivery_id,
        delivery_name,
        delivery_email,
        amount,
        transfer_date,
        reference_number,
        notes,
        status
    ) VALUES (
        theo_id,
        COALESCE(theo_nom || ' ' || theo_prenom, 'Théo'),
        'theo@cvneat.fr',
        40.00,
        CURRENT_DATE,
        NULL,
        'Paiement de 40€ effectué manuellement',
        'completed'
    ) RETURNING id INTO transfer_id;
    
    RAISE NOTICE 'Enregistrement de paiement créé avec l''ID: %', transfer_id;
    
    -- Marquer les commandes comme payées jusqu'à atteindre 40€
    -- On les marque dans l'ordre chronologique (plus anciennes en premier)
    UPDATE commandes
    SET livreur_paid_at = NOW()
    WHERE livreur_id = theo_id
      AND statut = 'livree'
      AND livreur_paid_at IS NULL
      AND id IN (
        SELECT c.id
        FROM commandes c
        WHERE c.livreur_id = theo_id
          AND c.statut = 'livree'
          AND c.livreur_paid_at IS NULL
        ORDER BY c.created_at ASC
        LIMIT (
          SELECT COUNT(*)
          FROM (
            SELECT c2.id, 
                   SUM(c2.frais_livraison) OVER (ORDER BY c2.created_at ASC) as cumul
            FROM commandes c2
            WHERE c2.livreur_id = theo_id
              AND c2.statut = 'livree'
              AND c2.livreur_paid_at IS NULL
            ORDER BY c2.created_at ASC
          ) sub
          WHERE sub.cumul <= 40.00
        )
      );
    
    GET DIAGNOSTICS montant_restant = ROW_COUNT;
    RAISE NOTICE 'Commandes marquées comme payées';
    
END $$;

-- ÉTAPE 5: Vérifier le résultat
SELECT 
    dt.id,
    dt.delivery_name,
    dt.delivery_email,
    dt.amount,
    dt.transfer_date,
    dt.reference_number,
    dt.notes,
    dt.status,
    dt.created_at
FROM delivery_transfers dt
WHERE dt.delivery_email = 'theo@cvneat.fr'
ORDER BY dt.created_at DESC
LIMIT 5;

-- ÉTAPE 6: Voir l'état après le paiement
SELECT 
    u.email,
    u.nom,
    u.prenom,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees_restantes,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL), 0) as montant_non_paye_restant,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NOT NULL) as commandes_payees,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NOT NULL), 0) as montant_deja_paye
FROM users u
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
GROUP BY u.email, u.nom, u.prenom;

