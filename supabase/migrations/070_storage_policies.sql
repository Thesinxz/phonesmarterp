-- ============================================================
-- Migration 070: Storage Security Policies 
-- ============================================================
-- Garante que cada empresa só acesse seus próprios arquivos.
-- Estrutura esperada dos paths: {empresa_id}/filename.ext

-- 1. Bucket: produtos
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('produtos', 'produtos', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Policies para bucket 'produtos'
DROP POLICY IF EXISTS "produtos_select" ON storage.objects;
CREATE POLICY "produtos_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'produtos'
    );

DROP POLICY IF EXISTS "produtos_insert" ON storage.objects;
CREATE POLICY "produtos_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
        AND octet_length(COALESCE((SELECT decode('', 'base64')), ''))::int <= 5242880 -- 5MB max
    );

DROP POLICY IF EXISTS "produtos_update" ON storage.objects;
CREATE POLICY "produtos_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
    );

DROP POLICY IF EXISTS "produtos_delete" ON storage.objects;
CREATE POLICY "produtos_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
    );

-- 2. Bucket: logos
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('logos', 'logos', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "logos_select" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'logos'
    );

DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
CREATE POLICY "logos_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
    );

DROP POLICY IF EXISTS "logos_update" ON storage.objects;
CREATE POLICY "logos_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
    );

DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'logos'
        AND (storage.foldername(name))[1] = (public.get_my_empresa_id())::text
    );

-- 3. Configuração de tamanho máximo (5MB global)
UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id IN ('produtos', 'logos');

-- 4. Reload
NOTIFY pgrst, 'reload schema';
