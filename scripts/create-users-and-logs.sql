-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de logs de actividad
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

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Agregar columnas de auditoría a las tablas existentes
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
ALTER TABLE brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Insertar usuario administrador por defecto
INSERT INTO users (email, name, password_hash, role) 
VALUES ('admin@inventario.com', 'Administrador', '$2b$10$rQZ8kHp.TB.It.NuiNQ5UOyTuUFi6Ms/Nt.f6JVYGNzpIGjLrbe.m', 'admin')
ON CONFLICT (email) DO NOTHING;
-- Contraseña por defecto: "admin123"

-- Insertar algunos usuarios de ejemplo
INSERT INTO users (email, name, password_hash, role) VALUES 
('usuario1@inventario.com', 'Juan Pérez', '$2b$10$rQZ8kHp.TB.It.NuiNQ5UOyTuUFi6Ms/Nt.f6JVYGNzpIGjLrbe.m', 'user'),
('usuario2@inventario.com', 'María García', '$2b$10$rQZ8kHp.TB.It.NuiNQ5UOyTuUFi6Ms/Nt.f6JVYGNzpIGjLrbe.m', 'user'),
('viewer@inventario.com', 'Carlos López', '$2b$10$rQZ8kHp.TB.It.NuiNQ5UOyTuUFi6Ms/Nt.f6JVYGNzpIGjLrbe.m', 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a las tablas
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
