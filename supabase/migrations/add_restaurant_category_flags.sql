ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS category_flags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category_flags_sync_at timestamptz;

