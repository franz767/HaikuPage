-- ==============================================
-- Migración: Sesión única para administradores
-- ==============================================

-- 1. Agregar columna current_session_id a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS current_session_id TEXT;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_current_session_id ON profiles(current_session_id);

-- 3. Comentario para documentación
COMMENT ON COLUMN profiles.current_session_id IS 'ID de sesión actual para validar sesión única (solo admins)';

-- 4. Política RLS para que usuarios puedan actualizar su propio session_id
DROP POLICY IF EXISTS "Users can update own session_id" ON profiles;

CREATE POLICY "Users can update own session_id" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
