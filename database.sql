-- Création de la base de données
CREATE DATABASE IF NOT EXISTS cvneat;
USE cvneat;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    role ENUM('user', 'admin', 'restaurant') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    type_cuisine VARCHAR(100) NOT NULL,
    horaires JSON,
    categories JSON,
    image_url VARCHAR(255),
    user_id INT,
    status ENUM('pending', 'active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des menus
CREATE TABLE IF NOT EXISTS menus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    disponible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS commandes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    statut ENUM('en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee') NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    adresse_livraison TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Table des détails de commande
CREATE TABLE IF NOT EXISTS commande_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commande_id INT NOT NULL,
    menu_id INT NOT NULL,
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commande_id) REFERENCES commandes(id),
    FOREIGN KEY (menu_id) REFERENCES menus(id)
);

-- Table des avis
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    order_id INT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (order_id) REFERENCES commandes(id)
);

-- Données de test pour les utilisateurs
INSERT INTO users (nom, prenom, email, password, telephone, adresse, code_postal, ville, role) VALUES
('Admin', 'System', 'admin@cvneat.com', '$2b$10$YourHashedPasswordHere', '0123456789', '123 Rue Admin', '75000', 'Paris', 'admin'),
('Restaurant', 'Owner', 'restaurant@cvneat.com', '$2b$10$YourHashedPasswordHere', '0123456788', '456 Rue Restaurant', '75000', 'Paris', 'restaurant');

-- Données de test pour les restaurants
INSERT INTO restaurants (nom, description, image_url, adresse, telephone, code_postal, ville, email, type_cuisine, user_id, status) VALUES
('Le Petit Bistrot', 'Cuisine française traditionnelle', '/images/restaurants/bistrot.jpg', '123 Rue de Paris', '0123456789', '75001', 'Paris', 'bistrot@cvneat.com', 'Française', 2, 'active'),
('Sushi Master', 'Sushi et cuisine japonaise', '/images/restaurants/sushi.jpg', '456 Avenue du Japon', '0123456788', '75002', 'Paris', 'sushi@cvneat.com', 'Japonaise', 2, 'active'),
('Pizza Express', 'Pizzas italiennes authentiques', '/images/restaurants/pizza.jpg', '789 Boulevard Italie', '0123456787', '75003', 'Paris', 'pizza@cvneat.com', 'Italienne', 2, 'active');

-- Données de test pour les menus
INSERT INTO menus (restaurant_id, nom, description, prix, image_url) VALUES
(1, 'Soupe à l''oignon', 'Soupe traditionnelle gratinée', 8.50, '/images/menu/soupe.jpg'),
(1, 'Coq au vin', 'Poulet mariné au vin rouge', 18.50, '/images/menu/coq.jpg'),
(2, 'California Roll', 'Rouleau de crabe et avocat', 12.50, '/images/menu/california.jpg'),
(2, 'Tempura de crevettes', 'Crevettes panées', 9.50, '/images/menu/tempura.jpg'),
(3, 'Margherita', 'Tomate, mozzarella, basilic', 10.50, '/images/menu/margherita.jpg'),
(3, 'Spaghetti Carbonara', 'Pâtes à la crème et lardons', 13.50, '/images/menu/carbonara.jpg'); 