-- ==============================================
-- Migracion: notifications
-- Descripcion: Sistema de notificaciones para usuarios
-- ==============================================

-- Tipo ENUM para tipos de notificacion
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'payment_submitted',       -- Para el usuario que envia: "Tu pago esta siendo procesado"
    'payment_pending_review',  -- Para admins: "Hay un pago pendiente de revision"
    'payment_approved',        -- Para el usuario: "Tu pago fue aprobado"
    'payment_rejected'         -- Para el usuario: "Tu pago fue rechazado"
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentarios de documentacion
COMMENT ON TABLE public.notifications IS 'Notificaciones para usuarios del sistema';
COMMENT ON COLUMN public.notifications.type IS 'Tipo de notificacion para iconos y colores';
COMMENT ON COLUMN public.notifications.data IS 'Datos adicionales: project_id, submission_id, amount, etc.';
COMMENT ON COLUMN public.notifications.read IS 'Si el usuario ya leyo la notificacion';

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created
  ON public.notifications(created_at DESC);

-- Indice parcial para notificaciones no leidas (consulta mas comun)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read = FALSE;

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
