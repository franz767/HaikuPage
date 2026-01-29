-- =============================================
-- Extensión de tareas: Fechas, Checklist, Adjuntos
-- =============================================

-- Añadir campos de fechas a project_tasks
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS due_time TIME;

-- =============================================
-- Tabla de Checklist para tareas
-- =============================================
CREATE TABLE IF NOT EXISTS task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES task_checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_items_checklist_id ON task_checklist_items(checklist_id);

-- =============================================
-- Tabla de Adjuntos para tareas
-- =============================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- =============================================
-- RLS Policies para las nuevas tablas
-- =============================================

-- Checklists
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Admins pueden todo
CREATE POLICY "Admins can manage checklists" ON task_checklists FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage checklist items" ON task_checklist_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage attachments" ON task_attachments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Miembros del proyecto pueden ver/crear
CREATE POLICY "Project members can view checklists" ON task_checklists FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t 
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE t.id = task_checklists.task_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can manage checklists" ON task_checklists FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t 
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE t.id = task_checklists.task_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can view checklist items" ON task_checklist_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM task_checklists c
  JOIN project_tasks t ON t.id = c.task_id
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE c.id = task_checklist_items.checklist_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can manage checklist items" ON task_checklist_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM task_checklists c
  JOIN project_tasks t ON t.id = c.task_id
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE c.id = task_checklist_items.checklist_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can view attachments" ON task_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t 
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE t.id = task_attachments.task_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can manage attachments" ON task_attachments FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t 
  JOIN project_members pm ON pm.project_id = t.project_id 
  WHERE t.id = task_attachments.task_id AND pm.user_id = auth.uid()
));
