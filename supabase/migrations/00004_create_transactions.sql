-- ==============================================
-- Tabla: transactions
-- Descripcion: Transacciones financieras (solo admin)
-- ==============================================

CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Comentarios
COMMENT ON TABLE public.transactions IS 'Transacciones financieras - SOLO ACCESIBLE POR ADMIN';
COMMENT ON COLUMN public.transactions.amount IS 'Monto de la transaccion (siempre positivo)';
COMMENT ON COLUMN public.transactions.type IS 'Tipo: income (ingreso) o expense (gasto)';
COMMENT ON COLUMN public.transactions.category IS 'Categoria de la transaccion';
COMMENT ON COLUMN public.transactions.project_id IS 'Proyecto asociado (opcional)';

-- Indices para reportes financieros
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_project ON public.transactions(project_id);

-- Indice compuesto para consultas de rango de fechas por tipo
CREATE INDEX idx_transactions_date_type ON public.transactions(date, type);

-- Habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
