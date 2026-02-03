-- ==============================================
-- Migración: Permitir a clientes ver su propio registro
-- Problema: Los usuarios con rol "cliente" no podían ver su propio
-- registro en la tabla clients, mostrando "Sin cliente" en la UI
-- ==============================================

-- Política para que los usuarios con rol "cliente" puedan ver su propio registro
CREATE POLICY "clients_own_record_select"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    -- El usuario tiene un perfil con client_id que apunta a este cliente
    id IN (
      SELECT p.client_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'cliente'
      AND p.client_id IS NOT NULL
    )
  );
