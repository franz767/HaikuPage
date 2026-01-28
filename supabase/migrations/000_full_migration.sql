-- ==============================================
-- MIGRACION COMPLETA - HAIKU SaaS
-- Ejecutar en Supabase SQL Editor
-- ==============================================

-- ==============================================
-- 1. TABLA: profiles
-- ==============================================

CREATE TYPE user_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario con roles y datos adicionales';
CREATE INDEX idx_profiles_role ON public.profiles(role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. TABLA: clients
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

CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_company ON public.clients(company);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 3. TABLA: projects
-- ==============================================

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
  metadata JSONB DEFAULT '{}'::jsonb,
  budget DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_projects_deadline ON public.projects(deadline);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_metadata ON public.projects USING GIN (metadata);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 4. TABLA: transactions
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

CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category ON public.transactions(category);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_transactions_project ON public.transactions(project_id);
CREATE INDEX idx_transactions_date_type ON public.transactions(date, type);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 5. TABLA: project_members
-- ==============================================

CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 6. TRIGGERS
-- ==============================================

-- Funcion para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: Crear perfil automaticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'user'::user_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- 7. POLITICAS RLS
-- ==============================================

-- Funciones helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- POLITICAS: profiles
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND (role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())))
  );

CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- POLITICAS: clients
CREATE POLICY "clients_admin_all"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "clients_user_select"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND id IN (
      SELECT DISTINCT p.client_id
      FROM public.projects p
      INNER JOIN public.project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = (SELECT auth.uid())
      AND p.client_id IS NOT NULL
    )
  );

-- POLITICAS: projects
CREATE POLICY "projects_admin_all"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_user_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND public.is_project_member(id)
  );

CREATE POLICY "projects_user_update"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    NOT public.is_admin()
    AND public.is_project_member(id)
  )
  WITH CHECK (
    NOT public.is_admin()
    AND public.is_project_member(id)
  );

-- POLITICAS: transactions (SOLO ADMIN)
CREATE POLICY "transactions_admin_only"
  ON public.transactions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- POLITICAS: project_members
CREATE POLICY "project_members_admin_all"
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "project_members_user_select"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ==============================================
-- FIN DE MIGRACION
-- ==============================================
