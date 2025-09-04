-- Mettre à jour la commande ID 27 dans la table orders
-- Vérifier d'abord la commande existante
SELECT 
  id,
  status,
  total_amount,
  delivery_fee,
  created_at,
  updated_at
FROM orders 
WHERE id = 27;

-- Mettre à jour la commande pour qu'elle soit "delivered"
UPDATE orders 
SET status = 'delivered',
    delivery_fee = 3.50,
    total_amount = 25.50,
    updated_at = NOW()
WHERE id = 27;

-- Vérifier la mise à jour
SELECT 
  id,
  status,
  total_amount,
  delivery_fee,
  updated_at
FROM orders 
WHERE id = 27;

-- Vérifier toutes les commandes avec le statut "delivered"
SELECT 
  id,
  status,
  total_amount,
  delivery_fee
FROM orders 
WHERE status = 'delivered';
