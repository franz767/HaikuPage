-- ==============================================
-- Tabla: clients
-- Descripcion: Clientes de la agencia
-- ==============================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Comentarios
COMMENT ON TABLE public.clients IS 'Clientes de la agencia';
COMMENT ON COLUMN public.clients.name IS 'Nombre del contacto principal';
COMMENT ON COLUMN public.clients.company IS 'Nombre de la empresa';
COMMENT ON COLUMN public.clients.created_by IS 'Usuario que creo el cliente';

-- Indices
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_company ON public.clients(company);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);

-- Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
