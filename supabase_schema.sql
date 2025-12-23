-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Brands Table
CREATE TABLE IF NOT EXISTS public.brands (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Table
-- Note: sku is NOT unique to allow price history tracking
CREATE TABLE IF NOT EXISTS public.inventory (
    id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    ean TEXT,
    description TEXT NOT NULL,
    cost_without_tax NUMERIC(10, 2) NOT NULL,
    cost_with_tax NUMERIC(10, 2) NOT NULL,
    pvp_without_tax NUMERIC(10, 2) NOT NULL,
    pvp_with_tax NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    company TEXT CHECK (company IN ('MAYCAM', 'BLUE DOGO', 'GLOBOBAZAAR')),
    channel TEXT CHECK (channel IN ('A', 'B')),
    date_entered TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
    stock_status TEXT CHECK (stock_status IN ('normal', 'missing', 'excess')) DEFAULT 'normal',
    supplier_id INTEGER REFERENCES public.suppliers(id),
    brand_id INTEGER REFERENCES public.brands(id),
    invoice_number TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Index for faster search by SKU
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory(sku);

-- 4. Config Table
CREATE TABLE IF NOT EXISTS public.config (
    id SERIAL PRIMARY KEY,
    iva_percentage NUMERIC(5, 2) DEFAULT 21.00,
    cuotas_3_percentage NUMERIC(5, 2) DEFAULT 20.00,
    cuotas_6_percentage NUMERIC(5, 2) DEFAULT 40.00,
    cuotas_9_percentage NUMERIC(5, 2) DEFAULT 60.00,
    cuotas_12_percentage NUMERIC(5, 2) DEFAULT 80.00,
    wholesale_percentage_1 NUMERIC(5, 2) DEFAULT 10.00,
    wholesale_percentage_2 NUMERIC(5, 2) DEFAULT 17.00,
    wholesale_percentage_3 NUMERIC(5, 2) DEFAULT 25.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO public.config (id, iva_percentage)
SELECT 1, 21.00
WHERE NOT EXISTS (SELECT 1 FROM public.config WHERE id = 1);

-- 5. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    expense_date TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Wholesale Clients Table
CREATE TABLE IF NOT EXISTS public.wholesale_clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    cuit TEXT NOT NULL,
    address TEXT,
    province TEXT,
    contact_person TEXT,
    email TEXT,
    whatsapp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 7. Wholesale Orders Table
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES public.wholesale_clients(id) ON DELETE CASCADE,
    order_date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- 8. Wholesale Order Items Table
CREATE TABLE IF NOT EXISTS public.wholesale_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES public.wholesale_orders(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Price History Table
CREATE TABLE IF NOT EXISTS public.price_history (
    id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    old_cost_without_tax NUMERIC(10, 2),
    new_cost_without_tax NUMERIC(10, 2),
    old_pvp_without_tax NUMERIC(10, 2),
    new_pvp_without_tax NUMERIC(10, 2),
    price_change_percentage NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for demo: allow public access or authenticated)
-- Adjust these based on your actual auth needs. Here assuming public/anon access is allowed for simplicity as per current code usage.

CREATE POLICY "Enable read access for all users" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.inventory FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.suppliers FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.brands FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.brands FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.config FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON public.config FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.expenses FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.wholesale_clients FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.wholesale_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.wholesale_clients FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.wholesale_clients FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.wholesale_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.wholesale_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.wholesale_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.wholesale_orders FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.wholesale_order_items FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.wholesale_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.wholesale_order_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.wholesale_order_items FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON public.price_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.price_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- Fix for SKU unique constraint if it exists (drop it)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_sku_key') THEN 
        ALTER TABLE public.inventory DROP CONSTRAINT inventory_sku_key; 
    END IF; 
END $$;
