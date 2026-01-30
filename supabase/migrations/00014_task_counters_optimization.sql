-- =============================================
-- OPTIMIZACIÓN: Contadores desnormalizados en tareas
-- Esto elimina la necesidad de queries N+1 en el Kanban
-- =============================================

-- Agregar columnas de contadores a project_tasks
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS checklist_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS checklist_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attachments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- =============================================
-- FUNCIONES TRIGGER PARA MANTENER CONTADORES ACTUALIZADOS
-- =============================================

-- Función para actualizar contadores de checklist
CREATE OR REPLACE FUNCTION update_task_checklist_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_total INT;
    v_completed INT;
BEGIN
    -- Determinar el task_id según la operación
    IF TG_TABLE_NAME = 'task_checklists' THEN
        v_task_id := COALESCE(NEW.task_id, OLD.task_id);
    ELSIF TG_TABLE_NAME = 'task_checklist_items' THEN
        -- Obtener task_id desde el checklist
        SELECT c.task_id INTO v_task_id
        FROM task_checklists c
        WHERE c.id = COALESCE(NEW.checklist_id, OLD.checklist_id);
    END IF;
    
    IF v_task_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calcular totales
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_completed = true)
    INTO v_total, v_completed
    FROM task_checklist_items ci
    JOIN task_checklists c ON c.id = ci.checklist_id
    WHERE c.task_id = v_task_id;
    
    -- Actualizar la tarea
    UPDATE project_tasks 
    SET 
        checklist_total = COALESCE(v_total, 0),
        checklist_completed = COALESCE(v_completed, 0)
    WHERE id = v_task_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar contador de adjuntos
CREATE OR REPLACE FUNCTION update_task_attachments_count()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_count INT;
BEGIN
    v_task_id := COALESCE(NEW.task_id, OLD.task_id);
    
    SELECT COUNT(*) INTO v_count
    FROM task_attachments
    WHERE task_id = v_task_id;
    
    UPDATE project_tasks 
    SET attachments_count = COALESCE(v_count, 0)
    WHERE id = v_task_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar contador de comentarios
CREATE OR REPLACE FUNCTION update_task_comments_count()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
    v_count INT;
BEGIN
    v_task_id := COALESCE(NEW.task_id, OLD.task_id);
    
    SELECT COUNT(*) INTO v_count
    FROM task_comments
    WHERE task_id = v_task_id;
    
    UPDATE project_tasks 
    SET comments_count = COALESCE(v_count, 0)
    WHERE id = v_task_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREAR TRIGGERS
-- =============================================

-- Triggers para checklist items
DROP TRIGGER IF EXISTS trg_update_checklist_counts_items ON task_checklist_items;
CREATE TRIGGER trg_update_checklist_counts_items
    AFTER INSERT OR UPDATE OR DELETE ON task_checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_task_checklist_counts();

-- Triggers para checklists (cuando se elimina un checklist completo)
DROP TRIGGER IF EXISTS trg_update_checklist_counts ON task_checklists;
CREATE TRIGGER trg_update_checklist_counts
    AFTER DELETE ON task_checklists
    FOR EACH ROW EXECUTE FUNCTION update_task_checklist_counts();

-- Triggers para adjuntos
DROP TRIGGER IF EXISTS trg_update_attachments_count ON task_attachments;
CREATE TRIGGER trg_update_attachments_count
    AFTER INSERT OR DELETE ON task_attachments
    FOR EACH ROW EXECUTE FUNCTION update_task_attachments_count();

-- Triggers para comentarios
DROP TRIGGER IF EXISTS trg_update_comments_count ON task_comments;
CREATE TRIGGER trg_update_comments_count
    AFTER INSERT OR DELETE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION update_task_comments_count();

-- =============================================
-- MIGRACIÓN INICIAL: Calcular contadores existentes
-- =============================================

-- Actualizar contadores de checklists para tareas existentes
UPDATE project_tasks t
SET 
    checklist_total = sub.total,
    checklist_completed = sub.completed
FROM (
    SELECT 
        c.task_id,
        COUNT(ci.id) as total,
        COUNT(ci.id) FILTER (WHERE ci.is_completed = true) as completed
    FROM task_checklists c
    LEFT JOIN task_checklist_items ci ON ci.checklist_id = c.id
    GROUP BY c.task_id
) sub
WHERE t.id = sub.task_id;

-- Actualizar contadores de adjuntos
UPDATE project_tasks t
SET attachments_count = sub.count
FROM (
    SELECT task_id, COUNT(*) as count
    FROM task_attachments
    GROUP BY task_id
) sub
WHERE t.id = sub.task_id;

-- Actualizar contadores de comentarios
UPDATE project_tasks t
SET comments_count = sub.count
FROM (
    SELECT task_id, COUNT(*) as count
    FROM task_comments
    GROUP BY task_id
) sub
WHERE t.id = sub.task_id;

-- Comentario
COMMENT ON COLUMN project_tasks.checklist_total IS 'Total de items en todos los checklists de la tarea';
COMMENT ON COLUMN project_tasks.checklist_completed IS 'Items completados en todos los checklists';
COMMENT ON COLUMN project_tasks.attachments_count IS 'Número de archivos adjuntos';
COMMENT ON COLUMN project_tasks.comments_count IS 'Número de comentarios';
