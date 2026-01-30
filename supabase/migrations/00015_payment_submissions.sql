-- ==============================================
-- Migracion: payment_submissions
-- Descripcion: Tabla para solicitudes de pago de cuotas
-- ==============================================

-- Tipo ENUM para estados de solicitud de pago
DO $$ BEGIN
  CREATE TYPE payment_submission_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  receipt_url TEXT NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status payment_submission_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios de documentacion
COMMENT ON TABLE public.payment_submissions IS 'Solicitudes de pago de cuotas de proyectos';
COMMENT ON COLUMN public.payment_submissions.installment_number IS 'Numero de cuota (1, 2, 3...)';
COMMENT ON COLUMN public.payment_submissions.receipt_url IS 'URL del comprobante de pago en Storage';
COMMENT ON COLUMN public.payment_submissions.status IS 'Estado: pending=esperando revision, approved=aprobado, rejected=rechazado';
COMMENT ON COLUMN public.payment_submissions.reviewer_notes IS 'Notas del administrador (especialmente en rechazos)';

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_payment_submissions_project
  ON public.payment_submissions(project_id);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_status
  ON public.payment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_submitted_by
  ON public.payment_submissions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_submitted_at
  ON public.payment_submissions(submitted_at DESC);

-- Indice parcial para buscar pagos pendientes (mas eficiente)
CREATE INDEX IF NOT EXISTS idx_payment_submissions_pending
  ON public.payment_submissions(status, submitted_at DESC)
  WHERE status = 'pending';

-- Trigger para actualizar updated_at
CREATE TRIGGER set_payment_submissions_updated_at
  BEFORE UPDATE ON public.payment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar RLS
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
