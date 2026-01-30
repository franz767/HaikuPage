-- ==============================================
-- Migracion: RLS Policies para payment_submissions y notifications
-- ==============================================

-- ==============================================
-- POLITICAS: payment_submissions
-- ==============================================

-- Admin: acceso total a todas las solicitudes de pago
CREATE POLICY "payment_submissions_admin_all"
  ON public.payment_submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users: pueden crear solicitudes de pago para proyectos donde son miembros
CREATE POLICY "payment_submissions_user_insert"
  ON public.payment_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    -- No es admin (los admins usan la politica anterior)
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    -- El usuario es el que envia
    AND submitted_by = auth.uid()
    -- El usuario es miembro del proyecto
    AND EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = payment_submissions.project_id
      AND user_id = auth.uid()
    )
  );

-- Users: pueden ver sus propias solicitudes
CREATE POLICY "payment_submissions_user_select"
  ON public.payment_submissions FOR SELECT
  TO authenticated
  USING (
    -- No es admin
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    -- Es el que envio la solicitud
    AND submitted_by = auth.uid()
  );

-- ==============================================
-- POLITICAS: notifications
-- ==============================================

-- Usuarios pueden ver solo sus propias notificaciones
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuarios pueden actualizar (marcar como leidas) solo sus propias notificaciones
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cualquier usuario autenticado puede crear notificaciones
-- (controlado por logica de negocio, no por RLS)
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
