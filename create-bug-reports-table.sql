-- Script SQL pour créer la table bug_reports
-- À exécuter dans Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bug_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    url VARCHAR(500),
    browser VARCHAR(50),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
    user_agent TEXT,
    screen_resolution VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')) DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- RLS (Row Level Security) - Les utilisateurs peuvent voir leurs propres signalements
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres signalements
CREATE POLICY "Users can view their own bug reports"
    ON bug_reports FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer des signalements
CREATE POLICY "Users can create bug reports"
    ON bug_reports FOR INSERT
    WITH CHECK (true);

-- Policy: Les admins peuvent tout voir
CREATE POLICY "Admins can view all bug reports"
    ON bug_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Les admins peuvent mettre à jour
CREATE POLICY "Admins can update bug reports"
    ON bug_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

