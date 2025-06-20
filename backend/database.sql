-- Création de la base de données
CREATE DATABASE IF NOT EXISTS cvneat_db;
USE cvneat_db;

-- Table des utilisateurs
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'partner', 'delivery', 'customer') NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT true,
    note_moyenne DECIMAL(3,2) DEFAULT 5.00
);

-- Table des restaurants
CREATE TABLE restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    adresse TEXT NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    cuisine_type VARCHAR(100) NOT NULL,
    horaires JSON NOT NULL,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(4,2) DEFAULT 15.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des catégories de plats
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Table des plats
CREATE TABLE plats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    category_id INT NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table des commandes
CREATE TABLE commandes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    livreur_id INT,
    status ENUM('en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee') DEFAULT 'en_attente',
    montant_total DECIMAL(10,2) NOT NULL,
    frais_livraison DECIMAL(10,2) NOT NULL,
    adresse_livraison TEXT NOT NULL,
    note_livreur INT,
    commentaire_livreur TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (livreur_id) REFERENCES users(id)
);

-- Table des détails de commande
CREATE TABLE details_commande (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commande_id INT NOT NULL,
    plat_id INT NOT NULL,
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commande_id) REFERENCES commandes(id),
    FOREIGN KEY (plat_id) REFERENCES plats(id)
);

-- Table des paiements
CREATE TABLE paiements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    commande_id INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    status ENUM('en_attente', 'complete', 'echoue', 'rembourse') NOT NULL,
    methode_paiement VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commande_id) REFERENCES commandes(id)
);

-- Table des paiements aux restaurants
CREATE TABLE paiements_restaurants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    status ENUM('en_attente', 'paye') NOT NULL,
    date_paiement TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- Table des paiements aux livreurs
CREATE TABLE paiements_livreurs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    delivery_id INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    status ENUM('en_attente', 'paye') NOT NULL,
    date_paiement TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_id) REFERENCES users(id)
);

-- Table des demandes d'inscription des restaurants
CREATE TABLE restaurant_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse TEXT NOT NULL,
    description TEXT,
    status ENUM('en_attente', 'approuvee', 'refusee') DEFAULT 'en_attente',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
); 