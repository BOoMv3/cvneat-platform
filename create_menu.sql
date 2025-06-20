-- Créer la table menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    category VARCHAR(100),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Insérer les plats d'exemple
INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES
(1, 'Burger Classique', 'Steak haché, cheddar, salade, tomate, oignon', 12.90, 'Burgers'),
(1, 'Frites Maison', 'Frites fraîches avec sel et poivre', 4.90, 'Accompagnements'),
(1, 'Milkshake Vanille', 'Crème glacée vanille, lait, chantilly', 6.90, 'Boissons'),
(2, 'Pizza Margherita', 'Sauce tomate, mozzarella, basilic frais', 11.90, 'Pizzas'),
(2, 'Pizza Quatre Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 14.90, 'Pizzas'),
(2, 'Tiramisu', 'Mascarpone, café, cacao', 6.90, 'Desserts'),
(3, 'Sushi California', 'Crevette, avocat, concombre, mayonnaise', 8.90, 'Sushis'),
(3, 'Maki Saumon', 'Saumon frais, riz, algue nori', 7.90, 'Sushis'),
(3, 'Soupe Miso', 'Tofu, algues, champignons', 4.90, 'Entrées'); 