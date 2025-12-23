-- Add city column to wholesale_clients table
ALTER TABLE wholesale_clients ADD COLUMN IF NOT EXISTS city TEXT;
