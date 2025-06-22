-- Create a view that combines auth.users with additional user data
CREATE OR REPLACE VIEW users AS
SELECT 
    au.id,
    COALESCE(ud.nom, 'Utilisateur') as nom,
    COALESCE(ud.prenom, '') as prenom,
    au.email,
    COALESCE(ud.telephone, '') as telephone,
    COALESCE(ud.adresse, '') as adresse,
    COALESCE(ud.code_postal, '') as code_postal,
    COALESCE(ud.ville, '') as ville,
    COALESCE(ud.role, 'user') as role,
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN user_details ud ON au.id = ud.user_id;

-- Create user_details table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nom VARCHAR(100),
    prenom VARCHAR(100),
    telephone VARCHAR(20),
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS on user_details
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;

-- Create policies for user_details
CREATE POLICY "Users can view their own details"
    ON user_details FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own details"
    ON user_details FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own details"
    ON user_details FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on user_details
CREATE TRIGGER update_user_details_updated_at
    BEFORE UPDATE ON user_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 