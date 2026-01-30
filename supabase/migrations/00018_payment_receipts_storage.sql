-- ==============================================
-- Migracion: Storage bucket para comprobantes de pago
-- ==============================================

-- Crear bucket 'payment-receipts' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  true,
  10485760, -- 10MB limite
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================
-- POLITICAS DE STORAGE
-- ==============================================

-- Ver recibos de pago: cualquier usuario autenticado
CREATE POLICY "payment_receipts_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts');

-- Subir recibos de pago: cualquier usuario autenticado
CREATE POLICY "payment_receipts_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Actualizar recibos: solo el propietario o admin
CREATE POLICY "payment_receipts_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);

-- Eliminar recibos: solo admin
CREATE POLICY "payment_receipts_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
