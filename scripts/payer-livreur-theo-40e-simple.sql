-- Script SQL SIMPLIFIÉ pour enregistrer le paiement de 40€ à theo@cvneat.fr (livreur)
-- Version simplifiée qui marque juste les commandes comme payées sans tracking détaillé
-- À exécuter dans Supabase SQL Editor

-- ÉTAPE 1: Vérifier que Théo existe et voir l'état actuel
SELECT 
    u.id,
    u.nom,
    u.prenom,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL), 0) as montant_non_paye
FROM users u
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
GROUP BY u.id, u.nom, u.prenom, u.email;

-- ÉTAPE 2: Créer la table delivery_transfers si elle n'existe pas
CREATE TABLE IF NOT EXISTS delivery_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_name TEXT NOT NULL,
  delivery_email TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_transfers_delivery_id ON delivery_transfers(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_transfers_transfer_date ON delivery_transfers(transfer_date DESC);

-- ÉTAPE 3: Enregistrer le paiement de 40€
INSERT INTO delivery_transfers (
    delivery_id,
    delivery_name,
    delivery_email,
    amount,
    transfer_date,
    notes,
    status
)
SELECT 
    u.id,
    COALESCE(u.nom || ' ' || u.prenom, 'Théo'),
    u.email,
    40.00,
    CURRENT_DATE,
    'Paiement de 40€ effectué manuellement',
    'completed'
FROM users u
WHERE u.email = 'theo@cvneat.fr'
  AND u.role = 'delivery'
LIMIT 1;

-- ÉTAPE 4: Marquer les commandes comme payées (les plus anciennes d'abord jusqu'à 40€)
-- On marque les commandes une par une dans l'ordre chronologique jusqu'à atteindre 40€
DO $$
DECLARE
    theo_id UUID;
    commande_record RECORD;
    total_marque DECIMAL(10,2) := 0;
    montant_cible DECIMAL(10,2) := 40.00;
BEGIN
    -- Récupérer l'ID de Théo
    SELECT id INTO theo_id
    FROM users
    WHERE email = 'theo@cvneat.fr'
      AND role = 'delivery'
    LIMIT 1;
    
    IF theo_id IS NULL THEN
        RAISE EXCEPTION 'Livreur theo@cvneat.fr non trouvé';
    END IF;
    
    -- Parcourir les commandes non payées dans l'ordre chronologique
    FOR commande_record IN
        SELECT id, frais_livraison
        FROM commandes
        WHERE livreur_id = theo_id
          AND statut = 'livree'
          AND livreur_paid_at IS NULL
        ORDER BY created_at ASC
    LOOP
        -- Vérifier si on a atteint le montant cible
        IF total_marque >= montant_cible THEN
            EXIT;
        END IF;
        
        -- Vérifier si on peut encore ajouter cette commande sans dépasser
        IF (total_marque + COALESCE(commande_record.frais_livraison, 0)) <= montant_cible THEN
            -- Marquer cette commande comme payée
            UPDATE commandes
            SET livreur_paid_at = NOW()
            WHERE id = commande_record.id;
            
            total_marque := total_marque + COALESCE(commande_record.frais_livraison, 0);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total marqué comme payé: %€', total_marque;
END $$;

-- ÉTAPE 5: Vérifier le résultat
SELECT 
    dt.amount,
    dt.transfer_date,
    dt.notes,
    dt.created_at,
    u.email,
    COUNT(c.id) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL) as commandes_non_payees_restantes,
    COALESCE(SUM(c.frais_livraison) FILTER (WHERE c.statut = 'livree' AND c.livreur_paid_at IS NULL), 0) as montant_non_paye_restant
FROM delivery_transfers dt
JOIN users u ON u.id = dt.delivery_id
LEFT JOIN commandes c ON c.livreur_id = u.id AND c.statut = 'livree'
WHERE dt.delivery_email = 'theo@cvneat.fr'
  AND dt.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY dt.amount, dt.transfer_date, dt.notes, dt.created_at, u.email
ORDER BY dt.created_at DESC
LIMIT 1;

