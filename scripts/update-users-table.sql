-- Agregar columna para controlar acceso a logs
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_logs BOOLEAN DEFAULT false;

-- Actualizar usuarios existentes - solo admins pueden ver logs por defecto
UPDATE users SET can_view_logs = true WHERE role = 'admin';
UPDATE users SET can_view_logs = false WHERE role IN ('user', 'viewer');
