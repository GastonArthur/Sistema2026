-- Script para corregir el esquema de la tabla users y recargar la caché de esquema
-- Ejecuta este script en el Editor SQL de Supabase

-- Agregar columna created_by si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_by') THEN
        ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id);
    END IF;
END $$;

-- Agregar columna updated_by si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_by') THEN
        ALTER TABLE users ADD COLUMN updated_by INTEGER REFERENCES users(id);
    END IF;
END $$;

-- Asegurar que existan otras columnas necesarias
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'can_view_wholesale') THEN
        ALTER TABLE users ADD COLUMN can_view_wholesale BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Recargar la caché de esquema de PostgREST (crucial para solucionar el error PGRST204)
NOTIFY pgrst, 'reload schema';
