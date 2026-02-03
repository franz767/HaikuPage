-- Vista para estadísticas de proyectos optimizada
-- Evita hacer N+1 queries desde el frontend

CREATE OR REPLACE VIEW project_stats_view AS
SELECT 
    p.id,
    p.name,
    p.status,
    -- Contadores por estado de tarea
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'inicio'), 0) as count_inicio,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'desarrollo'), 0) as count_desarrollo,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'bloqueado'), 0) as count_bloqueado,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'testing'), 0) as count_testing,
    COALESCE(COUNT(t.id) FILTER (WHERE t.status = 'entregado'), 0) as count_entregado,
    -- Total y Progreso
    COUNT(t.id) as total_tasks,
    CASE 
        WHEN COUNT(t.id) > 0 THEN 
            ROUND((COUNT(t.id) FILTER (WHERE t.status = 'entregado')::numeric / COUNT(t.id)::numeric) * 100)
        ELSE 0 
    END as completed_percentage
FROM projects p
LEFT JOIN project_tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.status;

-- Permisos (ajustar según tus necesidades, generalmente authenticated debe poder leer)
GRANT SELECT ON project_stats_view TO authenticated;
GRANT SELECT ON project_stats_view TO service_role;
