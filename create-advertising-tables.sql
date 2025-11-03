-- Script SQL pour créer les tables nécessaires pour le système de publicité
-- À exécuter dans Supabase SQL Editor

-- Table pour les demandes de publicité
CREATE TABLE IF NOT EXISTS advertising_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  website TEXT,
  description TEXT NOT NULL,
  position TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  budget DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table pour les candidatures de livreurs
CREATE TABLE IF NOT EXISTS delivery_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'motorcycle')),
  has_license BOOLEAN NOT NULL,
  experience TEXT,
  availability TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- S'assurer que la table advertisements a une colonne user_id pour lier aux clients
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_advertising_requests_user_id ON advertising_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_advertising_requests_status ON advertising_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_applications_user_id ON delivery_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_applications_status ON delivery_applications(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_user_id ON advertisements(user_id);

