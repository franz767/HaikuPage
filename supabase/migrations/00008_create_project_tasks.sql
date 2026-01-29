-- =============================================
-- Tabla de tareas del proyecto (Kanban)
-- =============================================

-- Crear función para actualizar updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear tabla de tareas
CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inicio',
  position INTEGER NOT NULL DEFAULT 0,
  label_color TEXT,
  label_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_position ON project_tasks(position);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Admins can manage all tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can view tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON project_tasks;
DROP POLICY IF EXISTS "Project members can update tasks" ON project_tasks;

-- Los admins pueden hacer todo
CREATE POLICY "Admins can manage all tasks"
  ON project_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Los miembros del proyecto pueden ver y crear tareas
CREATE POLICY "Project members can view tasks"
  ON project_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = project_tasks.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create tasks"
  ON project_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = project_tasks.project_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update tasks"
  ON project_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = project_tasks.project_id 
      AND user_id = auth.uid()
    )
  );
