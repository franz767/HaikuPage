-- =============================================
-- Comentarios y Actividad para tareas
-- =============================================

-- =============================================
-- Tabla de Comentarios
-- =============================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);

-- =============================================
-- Tabla de Actividad
-- =============================================
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Admins pueden todo
CREATE POLICY "Admins can manage comments" ON task_comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage activities" ON task_activities FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Miembros del proyecto pueden ver y crear comentarios
CREATE POLICY "Project members can view comments" ON task_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t
  JOIN project_members pm ON pm.project_id = t.project_id
  WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
));

CREATE POLICY "Project members can create comments" ON task_comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM project_tasks t
  JOIN project_members pm ON pm.project_id = t.project_id
  WHERE t.id = task_comments.task_id AND pm.user_id = auth.uid()
));

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Miembros del proyecto pueden ver actividad
CREATE POLICY "Project members can view activities" ON task_activities FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM project_tasks t
  JOIN project_members pm ON pm.project_id = t.project_id
  WHERE t.id = task_activities.task_id AND pm.user_id = auth.uid()
));

-- Miembros del proyecto pueden crear actividad
CREATE POLICY "Project members can create activities" ON task_activities FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM project_tasks t
  JOIN project_members pm ON pm.project_id = t.project_id
  WHERE t.id = task_activities.task_id AND pm.user_id = auth.uid()
));

-- =============================================
-- Trigger para actualizar updated_at en comentarios
-- =============================================
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_comment_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();
