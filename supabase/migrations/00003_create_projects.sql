-- ==============================================
-- Tabla: projects
-- Descripcion: Proyectos con metadata JSONB flexible
-- ==============================================

-- Crear tipo ENUM para estados de proyecto
CREATE TYPE project_status AS ENUM (
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  deadline DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Campo JSONB para configuraciones flexibles
  -- Estructura esperada:
  -- {
  --   "n8n_workflow_id": "string | null",
  --   "ai_prompts": { "summary": "string", "tasks": "string" },
  --   "integrations": { "slack_channel": "string", "notion_page": "string" },
  --   "custom_fields": { ... }
  -- }
  metadata JSONB DEFAULT '{}'::jsonb,

  budget DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Comentarios
COMMENT ON TABLE public.projects IS 'Proyectos de la agencia';
COMMENT ON COLUMN public.projects.metadata IS 'Campo JSONB para configuraciones flexibles: n8n, AI prompts, integraciones';
COMMENT ON COLUMN public.projects.status IS 'Estado actual del proyecto';
COMMENT ON COLUMN public.projects.budget IS 'Presupuesto total del proyecto en EUR';

-- Indices
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_projects_deadline ON public.projects(deadline);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

-- Indice GIN para busquedas en JSONB
CREATE INDEX idx_projects_metadata ON public.projects USING GIN (metadata);

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
