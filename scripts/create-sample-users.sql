-- Insertar usuarios de ejemplo para MAYCAM
INSERT INTO users (email, name, password_hash, role, is_active, can_view_logs) VALUES
('maycam@gmail.com', 'Administrador MAYCAM', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'admin', true, true),
('leticia@maycam.com', 'Leticia', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('camila@maycam.com', 'Camila', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('hernan@maycam.com', 'Hernan', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('mauro@maycam.com', 'Mauro', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('gaston@maycam.com', 'Gaston', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('lucas@maycam.com', 'Lucas', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true),
('mariano@maycam.com', 'Mariano', '$2b$12$LQv3c1yAvFnpsIjcLMTuNOHHDJkqP.TaP0gs2GuqbG5vMw/aO.Uy6', 'user', true, true)
ON CONFLICT (email) DO NOTHING;

-- Insertar proveedores de ejemplo
INSERT INTO suppliers (name, contact_person, email, phone, address, is_active) VALUES
('PROVEEDOR PRINCIPAL', 'Juan Pérez', 'juan@proveedor1.com', '+54 11 1234-5678', 'Av. Corrientes 1234, CABA', true),
('DISTRIBUIDOR NACIONAL', 'María García', 'maria@distribuidor.com', '+54 11 2345-6789', 'Av. Santa Fe 5678, CABA', true),
('IMPORTADOR DIRECTO', 'Carlos López', 'carlos@importador.com', '+54 11 3456-7890', 'Av. Rivadavia 9012, CABA', true)
ON CONFLICT (name) DO NOTHING;

-- Insertar marcas de ejemplo
INSERT INTO brands (name, description, is_active) VALUES
('MARCA PREMIUM', 'Productos de alta calidad y precio premium', true),
('MARCA ESTÁNDAR', 'Productos de calidad estándar para el mercado general', true),
('MARCA ECONÓMICA', 'Productos económicos para mercado masivo', true)
ON CONFLICT (name) DO NOTHING;

-- Insertar categorías de ejemplo
INSERT INTO categories (name, description, is_active) VALUES
('ELECTRÓNICOS', 'Productos electrónicos y tecnológicos', true),
('HOGAR', 'Artículos para el hogar y decoración', true),
('OFICINA', 'Suministros y equipos de oficina', true),
('HERRAMIENTAS', 'Herramientas y equipos de trabajo', true)
ON CONFLICT (name) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO inventory (
  code, name, description, category_id, brand_id, supplier_id,
  cost_price, sale_price, stock_quantity, min_stock, max_stock,
  location, is_active
) 
SELECT 
  'PROD001', 'Producto de Ejemplo 1', 'Descripción del producto de ejemplo',
  c.id, b.id, s.id,
  100.00, 150.00, 50, 10, 100,
  'Estante A1', true
FROM categories c, brands b, suppliers s
WHERE c.name = 'ELECTRÓNICOS' 
  AND b.name = 'MARCA PREMIUM' 
  AND s.name = 'PROVEEDOR PRINCIPAL'
  AND NOT EXISTS (SELECT 1 FROM inventory WHERE code = 'PROD001');

-- Registrar log de inicialización
INSERT INTO activity_logs (
  user_id, user_email, user_name, action, description,
  ip_address, user_agent
) VALUES (
  1, 'maycam@gmail.com', 'Administrador MAYCAM', 'SYSTEM_INIT',
  'Sistema inicializado con datos de ejemplo',
  '127.0.0.1', 'Sistema'
);
