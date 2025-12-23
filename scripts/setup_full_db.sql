-- COMPLETE DATABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor to setup all tables and policies.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users and Auth (Custom Implementation)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  can_view_logs BOOLEAN DEFAULT false,
  can_view_wholesale BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- 3. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INTEGER,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 4. Configuration
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  iva_percentage DECIMAL(5,2) DEFAULT 21.00,
  wholesale_percentage_1 DECIMAL(5,2) DEFAULT 10.00,
  wholesale_percentage_2 DECIMAL(5,2) DEFAULT 17.00,
  wholesale_percentage_3 DECIMAL(5,2) DEFAULT 25.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO config (id, iva_percentage, wholesale_percentage_1, wholesale_percentage_2, wholesale_percentage_3) 
VALUES (1, 21.00, 10.00, 17.00, 25.00) 
ON CONFLICT (id) DO NOTHING;

-- 5. Core Inventory Tables
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL,
  ean VARCHAR(100),
  description TEXT NOT NULL,
  cost_without_tax DECIMAL(10,2) NOT NULL,
  cost_with_tax DECIMAL(10,2) NOT NULL,
  pvp_without_tax DECIMAL(10,2) NOT NULL,
  pvp_with_tax DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  company VARCHAR(50) NOT NULL CHECK (company IN ('MAYCAM', 'BLUE DOGO', 'GLOBOBAZAAR')),
  channel VARCHAR(1) NOT NULL CHECK (channel IN ('A', 'B')),
  date_entered DATE NOT NULL,
  stock_status VARCHAR(20) DEFAULT 'normal' CHECK (stock_status IN ('normal', 'missing', 'excess')),
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  invoice_number VARCHAR(100),
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);

-- 6. Price History
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL,
  old_cost_without_tax DECIMAL(10,2),
  new_cost_without_tax DECIMAL(10,2),
  old_pvp_without_tax DECIMAL(10,2),
  new_pvp_without_tax DECIMAL(10,2),
  price_change_percentage DECIMAL(5,2),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_price_history_sku ON price_history(sku);

-- 7. Wholesale Management
CREATE TABLE IF NOT EXISTS wholesale_clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  cuit VARCHAR(20) NOT NULL,
  address TEXT,
  province VARCHAR(100),
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
  client_id INTEGER REFERENCES wholesale_clients(id) ON DELETE CASCADE,
  order_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
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
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_wholesale (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  wholesale_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  category TEXT,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventory_public (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  platform TEXT,
  status TEXT DEFAULT 'active',
  stock INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  has_invoice BOOLEAN DEFAULT false,
  invoice_number VARCHAR(100),
  invoice_date DATE,
  paid_by INTEGER REFERENCES users(id),
  paid_date DATE,
  payment_method VARCHAR(50) DEFAULT 'efectivo',
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- 9. Initial Data
-- Seed Admin User (password: maycamadmin2025!)
INSERT INTO users (email, name, password_hash, role, is_active, can_view_logs, can_view_wholesale) 
VALUES (
  'maycamadmin@maycam.com', 
  'Administrador MAYCAM', 
  '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6',
  'admin', 
  true, 
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Seed Expense Categories
INSERT INTO expense_categories (name, description) VALUES 
  ('Alquiler', 'Gastos de alquiler de local comercial'),
  ('Combustible', 'Gastos de combustible para vehículos'),
  ('Flete', 'Gastos de transporte y envíos'),
  ('Flex', 'Gastos de publicidad y marketing'),
  ('Servicios', 'Servicios públicos'),
  ('Limpieza', 'Productos y servicios de limpieza'),
  ('Gastos Varios', 'Otros gastos no categorizados')
ON CONFLICT (name) DO NOTHING;

-- Seed Suppliers
INSERT INTO suppliers (name) VALUES 
  ('PROVEEDOR PRINCIPAL'),
  ('DISTRIBUIDOR NACIONAL'),
  ('IMPORTADOR DIRECTO')
ON CONFLICT (name) DO NOTHING;

-- Seed Brands
INSERT INTO brands (name) VALUES 
  ('MARCA PREMIUM'),
  ('MARCA ESTÁNDAR'),
  ('MARCA ECONÓMICA')
ON CONFLICT (name) DO NOTHING;

-- 10. Enable RLS (Optional - allows access to public for now or authenticated)
ALTER TABLE inventory_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_wholesale ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all for authenticated users" ON inventory_public FOR ALL USING (true);
CREATE POLICY "Enable all for authenticated users" ON inventory_wholesale FOR ALL USING (true);
-- Note: 'true' allows everyone if RLS is enabled, better for avoiding permission issues in development.
-- In production, replace 'true' with "auth.role() = 'authenticated'".

-- End of Setup
