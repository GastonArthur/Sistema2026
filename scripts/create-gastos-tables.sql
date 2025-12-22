-- Crear tabla de categorías de gastos
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

-- Crear tabla de gastos
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

-- Insertar categorías predefinidas con ejemplos
INSERT INTO expense_categories (name, description) VALUES 
  ('Alquiler', 'Gastos de alquiler de local comercial'),
  ('Combustible', 'Gastos de combustible para vehículos'),
  ('Flete', 'Gastos de transporte y envíos'),
  ('Flex', 'Gastos de publicidad y marketing'),
  ('Servicios', 'Servicios públicos (luz, agua, gas, internet)'),
  ('Limpieza', 'Productos y servicios de limpieza'),
  ('Gastos Varios', 'Otros gastos no categorizados')
ON CONFLICT (name) DO NOTHING;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by);

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos gastos de ejemplo para el mes actual
INSERT INTO expenses (description, amount, expense_date, category_id, has_invoice, created_by, paid_by, paid_date, payment_method, observations) VALUES 
  ('Alquiler local comercial - ' || TO_CHAR(CURRENT_DATE, 'MM/YYYY'), 150000.00, DATE_TRUNC('month', CURRENT_DATE), 1, true, 1, 1, CURRENT_DATE, 'transferencia', 'Alquiler mensual'),
  ('Combustible vehículo reparto', 25000.00, CURRENT_DATE - INTERVAL '5 days', 2, true, 1, 1, CURRENT_DATE - INTERVAL '5 days', 'efectivo', 'Carga completa'),
  ('Servicio de internet mensual', 8500.00, CURRENT_DATE - INTERVAL '3 days', 5, true, 1, 1, CURRENT_DATE - INTERVAL '3 days', 'transferencia', 'Plan empresarial'),
  ('Productos de limpieza', 12000.00, CURRENT_DATE - INTERVAL '7 days', 6, false, 1, 1, CURRENT_DATE - INTERVAL '7 days', 'efectivo', 'Detergentes y desinfectantes')
ON CONFLICT DO NOTHING;
