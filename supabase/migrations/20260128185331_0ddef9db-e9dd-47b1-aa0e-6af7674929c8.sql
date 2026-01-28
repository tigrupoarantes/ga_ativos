-- Criar bucket para documentos de veículos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'veiculos-documentos', 
  'veiculos-documentos', 
  true,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Política de leitura pública
CREATE POLICY "Acesso público para leitura de documentos de veículos" ON storage.objects
  FOR SELECT USING (bucket_id = 'veiculos-documentos');

-- Política para usuários autenticados fazerem upload
CREATE POLICY "Usuários autenticados podem fazer upload de documentos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'veiculos-documentos' 
    AND auth.role() = 'authenticated'
  );

-- Política para usuários autenticados excluírem
CREATE POLICY "Usuários autenticados podem excluir documentos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'veiculos-documentos' 
    AND auth.role() = 'authenticated'
  );