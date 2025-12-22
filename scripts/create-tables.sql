-- Crear tabla de configuración para IVA
CREATE TABLE IF NOT EXISTS config (
  id SERIAL PRIMARY KEY,
  iva_percentage DECIMAL(5,2) DEFAULT 21.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración inicial de IVA
INSERT INTO config (iva_percentage) VALUES (21.00) ON CONFLICT (id) DO NOTHING;

-- Crear tabla de proveedores PRIMERO
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de marcas PRIMERO
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla principal de productos/mercadería DESPUÉS
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
  supplier_id INTEGER,
  brand_id INTEGER,
  invoice_number VARCHAR(100),
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar foreign keys DESPUÉS de crear todas las tablas
ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_supplier 
FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE inventory 
ADD CONSTRAINT fk_inventory_brand 
FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;

-- Crear tabla de historial de precios
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(100) NOT NULL,
  old_cost_without_tax DECIMAL(10,2),
  new_cost_without_tax DECIMAL(10,2),
  old_pvp_without_tax DECIMAL(10,2),
  new_pvp_without_tax DECIMAL(10,2),
  price_change_percentage DECIMAL(5,2),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_id ON inventory(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_brand_id ON inventory(brand_id);
CREATE INDEX IF NOT EXISTS idx_inventory_date_entered ON inventory(date_entered);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON inventory(company);

-- Insertar algunos proveedores y marcas de ejemplo
INSERT INTO suppliers (name) VALUES 
  ('Proveedor A'),
  ('Proveedor B'),
  ('Proveedor C')
ON CONFLICT (name) DO NOTHING;

INSERT INTO brands (name) VALUES 
  ('Marca Premium'),
  ('Marca Económica'),
  ('Marca Internacional')
ON CONFLICT (name) DO NOTHING;
