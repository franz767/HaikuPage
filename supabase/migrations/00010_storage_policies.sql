-- =============================================
-- Políticas de seguridad para el bucket 'attachments'
-- =============================================

-- Asegurarse de que el bucket existe (esto es opcional si ya lo creaste por dashboard, pero es buena práctica)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 1. PERMITIR VER ARCHIVOS
-- Cualquier usuario autenticado puede ver archivos en este bucket
CREATE POLICY "Ver adjuntos"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'attachments' );

-- 2. PERMITIR SUBIR ARCHIVOS
-- Cualquier usuario autenticado puede subir archivos a este bucket
CREATE POLICY "Subir adjuntos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'attachments' );

-- 3. PERMITIR ELIMINAR ARCHIVOS
-- Cualquier usuario autenticado puede eliminar archivos de este bucket
CREATE POLICY "Eliminar adjuntos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'attachments' );
