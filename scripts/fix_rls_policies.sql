-- Script para corregir permisos de Supabase (RLS)
-- Este script asegura que la aplicación pueda leer y escribir datos
-- usando la autenticación personalizada (rol 'anon' de Supabase).

-- Habilitar RLS y crear políticas de acceso público para todas las tablas

-- Función auxiliar para configurar tabla
CREATE OR REPLACE FUNCTION enable_public_access(tbl text) RETURNS void AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', tbl);
    EXECUTE format('CREATE POLICY "Public Access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas del sistema
SELECT enable_public_access('users');
SELECT enable_public_access('user_sessions');
SELECT enable_public_access('activity_logs');
SELECT enable_public_access('config');
SELECT enable_public_access('suppliers');
SELECT enable_public_access('brands');
SELECT enable_public_access('inventory');
SELECT enable_public_access('price_history');
SELECT enable_public_access('expense_categories');
SELECT enable_public_access('expenses');
SELECT enable_public_access('wholesale_clients');
SELECT enable_public_access('wholesale_orders');

-- Limpiar función auxiliar
DROP FUNCTION enable_public_access;

-- Confirmación
SELECT 'Permisos configurados correctamente. El sistema ahora permite lectura/escritura pública (necesario para el sistema de auth personalizado).' as result;
