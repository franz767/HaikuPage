-- ==============================================
-- POLITICAS RLS - SEGURIDAD CRITICA
-- ==============================================

-- Funcion helper para verificar si es admin (cacheable)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Funcion helper para verificar membresia en proyecto
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid
    AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================
-- POLITICAS: profiles
-- ==============================================

-- Todos los usuarios autenticados pueden ver perfiles basicos
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Solo el propio usuario puede actualizar su perfil (excepto role)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    -- Evitar que usuarios cambien su propio rol
    AND (role = (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())))
  );

-- Admin puede actualizar cualquier perfil (incluyendo roles)
CREATE POLICY "profiles_update_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================
-- POLITICAS: clients
-- ==============================================

-- Admin: acceso total
CREATE POLICY "clients_admin_all"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users: solo lectura de clientes relacionados a sus proyectos
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

-- ==============================================
-- POLITICAS: projects (COMPLEJA)
-- ==============================================

-- Admin: acceso total a todos los proyectos
CREATE POLICY "projects_admin_all"
  ON public.projects FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users: SELECT solo proyectos donde son miembros
CREATE POLICY "projects_user_select"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    NOT public.is_admin()
    AND public.is_project_member(id)
  );

-- Users: UPDATE solo en proyectos donde son miembros
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

-- ==============================================
-- POLITICAS: transactions (SOLO ADMIN)
-- ==============================================

-- SOLO Admin puede ver y gestionar transacciones
-- NOTA: No hay politicas para 'user' - acceso completamente bloqueado
CREATE POLICY "transactions_admin_only"
  ON public.transactions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================
-- POLITICAS: project_members
-- ==============================================

-- Admin: gestion total de asignaciones
CREATE POLICY "project_members_admin_all"
  ON public.project_members FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users: pueden ver las asignaciones de proyectos donde participan
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
