-- Agregar campo is_completed a project_tasks
-- Este campo permite marcar una tarea como completada sin moverla de columna

ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;

-- Índice para filtrar tareas completadas
CREATE INDEX IF NOT EXISTS idx_project_tasks_is_completed ON project_tasks(is_completed);
