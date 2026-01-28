-- ==============================================
-- Tabla: project_members
-- Descripcion: Relacion M:N entre proyectos y usuarios
-- ==============================================

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Evitar duplicados
  UNIQUE(project_id, user_id)
);

-- Comentarios
COMMENT ON TABLE public.project_members IS 'Asignacion de usuarios a proyectos (M:N)';
COMMENT ON COLUMN public.project_members.assigned_by IS 'Admin que asigno al usuario';

-- Indices para consultas frecuentes
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);

-- Habilitar RLS
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
