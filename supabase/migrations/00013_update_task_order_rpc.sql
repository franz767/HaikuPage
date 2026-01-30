-- =============================================
-- RPC Function: update_task_order (Batch Update)
-- Permite actualizar múltiples tareas en una sola transacción
-- Optimizado para operaciones de drag & drop en Kanban
-- =============================================

-- Crear la función RPC para actualización masiva
CREATE OR REPLACE FUNCTION update_task_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    task_record JSONB;
    updated_count INT := 0;
    task_id UUID;
    task_position INT;
    task_status TEXT;
    first_project_id UUID;
BEGIN
    -- Validar que el payload no esté vacío
    IF payload IS NULL OR jsonb_array_length(payload) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Payload vacío o inválido',
            'updated_count', 0
        );
    END IF;
    
    -- Obtener el project_id de la primera tarea para verificar permisos
    SELECT (payload->0->>'id')::UUID INTO task_id;
    SELECT project_id INTO first_project_id 
    FROM project_tasks 
    WHERE id = task_id;
    
    -- Verificar que el usuario tenga acceso al proyecto
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) AND NOT EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = first_project_id 
        AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No tienes permiso para modificar estas tareas',
            'updated_count', 0
        );
    END IF;
    
    -- Iterar sobre cada tarea en el payload y actualizarla
    FOR task_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        task_id := (task_record->>'id')::UUID;
        task_position := (task_record->>'position')::INT;
        task_status := task_record->>'status';
        
        -- Validar que los campos requeridos existan
        IF task_id IS NULL OR task_position IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Realizar el UPDATE
        UPDATE project_tasks
        SET 
            position = task_position,
            status = COALESCE(task_status, status),
            updated_at = NOW()
        WHERE id = task_id;
        
        -- Incrementar contador si se actualizó
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    -- Retornar resultado exitoso
    RETURN jsonb_build_object(
        'success', true,
        'updated_count', updated_count
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'updated_count', 0
        );
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION update_task_order(JSONB) TO authenticated;

-- Comentario descriptivo para la función
COMMENT ON FUNCTION update_task_order(JSONB) IS 
'Función RPC para actualizar múltiples tareas en batch. 
Payload: [{id: UUID, position: INT, status?: TEXT}, ...]
Retorna: {success: BOOL, updated_count: INT, error?: TEXT}';
