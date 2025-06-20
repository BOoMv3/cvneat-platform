-- Create restaurant_requests table
CREATE TABLE restaurant_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT NOT NULL,
    adresse TEXT NOT NULL,
    code_postal TEXT NOT NULL,
    ville TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE restaurant_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Les administrateurs peuvent voir toutes les demandes"
    ON restaurant_requests
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Les administrateurs peuvent mettre à jour les demandes"
    ON restaurant_requests
    FOR UPDATE
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "Tout le monde peut créer une demande"
    ON restaurant_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_restaurant_requests_updated_at
    BEFORE UPDATE ON restaurant_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 