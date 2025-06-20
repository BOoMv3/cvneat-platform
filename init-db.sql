-- Création de la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS cvneat;

-- Utilisation de la base de données
USE cvneat;

-- Création de la table restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(255),
    postalCode VARCHAR(10),
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    cuisineType VARCHAR(100),
    openingHours TEXT,
    imageUrl VARCHAR(255),
    userId INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertion de quelques données de test
INSERT INTO restaurants (name, description, address, postalCode, city, phone, email, cuisineType, openingHours, imageUrl) VALUES
('Le Petit Bistrot', 'Un charmant bistrot français au cœur de la ville', '123 Rue de la Paix', '75001', 'Paris', '0123456789', 'contact@petitbistrot.fr', 'Français', 'Lun-Dim: 12h-23h', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'),
('Pizza Express', 'Les meilleures pizzas de la ville', '456 Avenue des Pizzas', '75002', 'Paris', '0123456788', 'contact@pizzaexpress.fr', 'Italien', 'Lun-Dim: 11h-23h', 'https://images.unsplash.com/photo-1513104890138-7c749659a591'),
('Sushi Master', 'Sushi frais et authentique', '789 Rue du Japon', '75003', 'Paris', '0123456787', 'contact@sushimaster.fr', 'Japonais', 'Mar-Dim: 12h-22h', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c'); 