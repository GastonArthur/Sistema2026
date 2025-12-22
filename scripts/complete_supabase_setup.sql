-- COMPLETE SUPABASE SETUP FOR INVENTORY MANAGEMENT SYSTEM
-- This script sets up the entire database schema, including tables, relationships, indexes, and initial data.

-- 1. Enable UUID extension (optional but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users and Auth (Custom Implementation)
-- Note: This system uses a custom users table, not Supabase Auth's auth.users
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
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

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
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- 4. Configuration
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  iva_percentage DECIMAL(5,2) DEFAULT 21.00,
  wholesale_percentage_1 DECIMAL(5,2) DEFAULT 10.00,
  wholesale_percentage_2 DECIMAL(5,2) DEFAULT 17.00,
  wholesale_percentage_3 DECIMAL(5,2) DEFAULT 25.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
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
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_brand_id ON inventory(brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_date_entered ON inventory(date_entered);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company);
CREATE INDEX IF NOT EXISTS idx_inventory_company_channel ON inventory(company, channel);

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

-- 7. Expenses Management
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
  payment_method VARCHAR(50) DEFAULT 'efectivo' CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'tarjeta')),
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

-- 8. Wholesale Management (Mayoristas)
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

CREATE INDEX IF NOT EXISTS idx_wholesale_clients_name ON wholesale_clients(name);
CREATE INDEX IF NOT EXISTS idx_wholesale_clients_cuit ON wholesale_clients(cuit);

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

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_client ON wholesale_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_date ON wholesale_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_status ON wholesale_orders(status);

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

CREATE INDEX IF NOT EXISTS idx_wholesale_order_items_order ON wholesale_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_order_items_sku ON wholesale_order_items(sku);

-- 9. Automation and Maintenance
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wholesale_clients_updated_at ON wholesale_clients;
CREATE TRIGGER update_wholesale_clients_updated_at BEFORE UPDATE ON wholesale_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wholesale_orders_updated_at ON wholesale_orders;
CREATE TRIGGER update_wholesale_orders_updated_at BEFORE UPDATE ON wholesale_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 10. Initial Data Seeding

-- Seed Admin User
INSERT INTO users (email, name, password_hash, role, is_active, can_view_logs, can_view_wholesale) 
VALUES (
  'maycamadmin@maycam.com', 
  'Administrador MAYCAM', 
  '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', -- maycamadmin2025!
  'admin', 
  true, 
  true,
  true
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  can_view_logs = EXCLUDED.can_view_logs,
  can_view_wholesale = EXCLUDED.can_view_wholesale;

-- Seed Expense Categories
INSERT INTO expense_categories (name, description) VALUES 
  ('Alquiler', 'Gastos de alquiler de local comercial'),
  ('Combustible', 'Gastos de combustible para vehículos'),
  ('Flete', 'Gastos de transporte y envíos'),
  ('Flex', 'Gastos de publicidad y marketing'),
  ('Servicios', 'Servicios públicos (luz, agua, gas, internet)'),
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
