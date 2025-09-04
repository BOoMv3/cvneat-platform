-- Script SQL pour créer une nouvelle commande de test
-- À exécuter dans l'éditeur SQL de Supabase

-- Créer une nouvelle commande de test
INSERT INTO orders (
    restaurant_id,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_city,
    delivery_postal_code,
    delivery_instructions,
    total_amount,
    delivery_fee,
    status,
    items,
    created_at,
    updated_at
) VALUES (
    '4572cee6-1fc6-4f32-b007-57c46871ec70', -- ID du "Restaurant Test" visible dans votre debug
    'Client Test Alerte',
    '0612345678',
    '15 Rue de la Nouvelle Commande',
    'Paris',
    '75001',
    'Sonner fort, 3ème étage',
    32.50,
    3.00,
    'pending', -- Statut initial pour qu'elle soit disponible pour les livreurs
    '[
        {
            "name": "Pizza Quatre Fromages",
            "price": 18.50,
            "quantity": 1,
            "category": "Pizza"
        },
        {
            "name": "Salade César",
            "price": 8.00,
            "quantity": 1,
            "category": "Salade"
        },
        {
            "name": "Coca Cola",
            "price": 3.00,
            "quantity": 2,
            "category": "Boisson"
        }
    ]'::jsonb,
    NOW(),
    NOW()
);

-- Vérifier que la commande a été créée
SELECT 
    id,
    customer_name,
    delivery_address,
    total_amount,
    status,
    created_at
FROM orders 
WHERE customer_name = 'Client Test Alerte'
ORDER BY created_at DESC
LIMIT 1;
