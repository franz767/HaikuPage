-- ==============================================
-- Migración: Agregar rol "cliente" y campo client_id a profiles
-- ==============================================

-- 1. Agregar el nuevo valor "cliente" al enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Agregar columna client_id a profiles (para vincular usuario cliente con su registro de cliente)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 3. Crear índice para búsquedas por client_id
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON profiles(client_id);

-- 4. Crear política RLS para que los clientes solo vean sus proyectos
-- Primero, crear una función helper para verificar si el usuario es cliente de un proyecto
CREATE OR REPLACE FUNCTION is_project_client(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    JOIN profiles pr ON pr.client_id = p.client_id
    WHERE p.id = project_uuid
    AND pr.id = auth.uid()
    AND pr.role = 'cliente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar política de SELECT en projects para incluir clientes
DROP POLICY IF EXISTS "Users can view projects they are members of or admins" ON projects;

CREATE POLICY "Users can view projects they are members of, admins, or clients" ON projects
  FOR SELECT
  USING (
    is_admin()
    OR is_project_member(id)
    OR is_project_client(id)
  );

-- 6. Política para que clientes puedan ver las tareas de sus proyectos (solo lectura)
DROP POLICY IF EXISTS "Users can view tasks of their projects" ON project_tasks;

CREATE POLICY "Users can view tasks of their projects" ON project_tasks
  FOR SELECT
  USING (
    is_admin()
    OR is_project_member(project_id)
    OR is_project_client(project_id)
  );

-- 7. Comentarios para documentación
COMMENT ON COLUMN profiles.client_id IS 'ID del cliente vinculado (solo para usuarios con rol cliente)';
COMMENT ON FUNCTION is_project_client(UUID) IS 'Verifica si el usuario actual es el cliente del proyecto';
