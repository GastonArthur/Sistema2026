-- Add city column to wholesale_clients if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wholesale_clients' AND column_name = 'city') THEN
        ALTER TABLE wholesale_clients ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

-- Ensure wholesale_order_items has necessary columns and no strict foreign key on sku if we want to allow custom SKUs
-- Note: Usually we don't put FK on SKU to inventory if we want flexibility, or we make it nullable.
-- Let's check if there is a FK constraint on SKU
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'wholesale_order_items' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%sku%'
    ) THEN
        ALTER TABLE wholesale_order_items DROP CONSTRAINT IF EXISTS wholesale_order_items_sku_fkey; -- Name might vary, this is a guess.
        -- Better to just ensure the table definition allows arbitrary SKUs.
    END IF;
END $$;

-- Re-run the table creation if it doesn't exist (safety)
CREATE TABLE IF NOT EXISTS wholesale_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    cuit VARCHAR(20) NOT NULL,
    address TEXT,
    province VARCHAR(100),
    city VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    whatsapp VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wholesale_orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES wholesale_clients(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wholesale_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES wholesale_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL
);

-- Function to handle timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_wholesale_clients_updated_at ON wholesale_clients;
CREATE TRIGGER update_wholesale_clients_updated_at
    BEFORE UPDATE ON wholesale_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wholesale_orders_updated_at ON wholesale_orders;
CREATE TRIGGER update_wholesale_orders_updated_at
    BEFORE UPDATE ON wholesale_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
