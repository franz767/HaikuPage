-- ==============================================
-- DATOS DE PRUEBA (SEED)
-- Nota: Ejecutar despues de crear usuarios de prueba
-- ==============================================

-- Insertar clientes de ejemplo
INSERT INTO public.clients (id, name, company, email) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Maria Garcia', 'Tech Solutions SL', 'maria@techsolutions.com'),
  ('c1000000-0000-0000-0000-000000000002', 'Carlos Lopez', 'Digital Agency', 'carlos@digitalagency.com'),
  ('c1000000-0000-0000-0000-000000000003', 'Ana Martinez', 'StartupXYZ', 'ana@startupxyz.io')
ON CONFLICT (email) DO NOTHING;

-- Insertar proyectos de ejemplo
INSERT INTO public.projects (id, name, description, status, deadline, client_id, budget, metadata) VALUES
  (
    'p1000000-0000-0000-0000-000000000001',
    'Rediseno Web Corporativa',
    'Modernizacion completa del sitio web corporativo con nuevo branding',
    'active',
    '2025-03-15',
    'c1000000-0000-0000-0000-000000000001',
    15000.00,
    '{"n8n_workflow_id": "wf_123abc", "ai_prompts": {"summary": "Genera un resumen semanal del progreso"}, "integrations": {"slack_channel": "#proyecto-web"}}'::jsonb
  ),
  (
    'p1000000-0000-0000-0000-000000000002',
    'App Movil E-commerce',
    'Desarrollo de aplicacion iOS/Android para tienda online',
    'active',
    '2025-04-30',
    'c1000000-0000-0000-0000-000000000002',
    35000.00,
    '{"n8n_workflow_id": null, "ai_prompts": {}, "integrations": {"github_repo": "org/ecommerce-app"}}'::jsonb
  ),
  (
    'p1000000-0000-0000-0000-000000000003',
    'Campana Marketing Q1',
    'Estrategia de contenido y publicidad para primer trimestre',
    'completed',
    '2025-01-31',
    'c1000000-0000-0000-0000-000000000003',
    8000.00,
    '{"integrations": {"notion_page": "marketing-q1-2025"}}'::jsonb
  ),
  (
    'p1000000-0000-0000-0000-000000000004',
    'Sistema CRM Interno',
    'Desarrollo de herramienta CRM personalizada',
    'draft',
    '2025-06-01',
    NULL,
    25000.00,
    '{}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Insertar transacciones de ejemplo (ultimos 6 meses)
INSERT INTO public.transactions (amount, type, category, description, project_id, date) VALUES
  -- Enero 2025
  (15000.00, 'income', 'Proyecto', 'Anticipo 50% - Rediseno Web', 'p1000000-0000-0000-0000-000000000001', '2025-01-05'),
  (17500.00, 'income', 'Proyecto', 'Anticipo 50% - App Movil', 'p1000000-0000-0000-0000-000000000002', '2025-01-10'),
  (8000.00, 'income', 'Proyecto', 'Pago final - Campana Marketing', 'p1000000-0000-0000-0000-000000000003', '2025-01-28'),
  (2500.00, 'expense', 'Software', 'Licencias Figma anual', NULL, '2025-01-02'),
  (1200.00, 'expense', 'Servicios', 'Hosting y dominios', NULL, '2025-01-15'),
  (3500.00, 'expense', 'Freelance', 'Desarrollador externo - App', 'p1000000-0000-0000-0000-000000000002', '2025-01-20'),

  -- Diciembre 2024
  (12000.00, 'income', 'Consultoria', 'Auditoria UX cliente externo', NULL, '2024-12-10'),
  (5000.00, 'income', 'Mantenimiento', 'Contrato anual soporte', NULL, '2024-12-15'),
  (800.00, 'expense', 'Marketing', 'Publicidad LinkedIn', NULL, '2024-12-05'),
  (1500.00, 'expense', 'Oficina', 'Equipamiento', NULL, '2024-12-20'),

  -- Noviembre 2024
  (20000.00, 'income', 'Proyecto', 'Proyecto finalizado - Landing', NULL, '2024-11-15'),
  (4000.00, 'expense', 'Freelance', 'Disenador grafico', NULL, '2024-11-10'),
  (600.00, 'expense', 'Software', 'Suscripciones mensuales', NULL, '2024-11-01'),

  -- Octubre 2024
  (18000.00, 'income', 'Proyecto', 'Desarrollo web cliente', NULL, '2024-10-20'),
  (3000.00, 'expense', 'Servicios', 'Servicios cloud', NULL, '2024-10-15'),

  -- Septiembre 2024
  (10000.00, 'income', 'Consultoria', 'Workshop estrategia digital', NULL, '2024-09-25'),
  (2000.00, 'expense', 'Marketing', 'Evento networking', NULL, '2024-09-10'),

  -- Agosto 2024
  (15000.00, 'income', 'Proyecto', 'Proyecto app interna', NULL, '2024-08-15'),
  (4500.00, 'expense', 'Freelance', 'Desarrollador backend', NULL, '2024-08-20')
ON CONFLICT DO NOTHING;
