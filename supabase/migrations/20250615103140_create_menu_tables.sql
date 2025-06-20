-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Restaurants can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = restaurant_id);

-- Create policies for menu_items
CREATE POLICY "Restaurants can view their own menu items"
    ON menu_items FOR SELECT
    USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can insert their own menu items"
    ON menu_items FOR INSERT
    WITH CHECK (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can update their own menu items"
    ON menu_items FOR UPDATE
    USING (auth.uid() = restaurant_id);

CREATE POLICY "Restaurants can delete their own menu items"
    ON menu_items FOR DELETE
    USING (auth.uid() = restaurant_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 