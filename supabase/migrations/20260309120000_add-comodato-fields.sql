-- Migration: Adiciona campos para geração de contratos de comodato

-- Campos adicionais no cadastro de funcionários (para contratos)
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS rg TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Campos adicionais na tabela de ativos (para contratos)
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS imei2 TEXT,
  ADD COLUMN IF NOT EXISTS acessorios TEXT;

-- Campos de controle de contrato na tabela de atribuições
ALTER TABLE public.atribuicoes
  ADD COLUMN IF NOT EXISTS contrato_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS contrato_gerado_em TIMESTAMPTZ;

-- Criar bucket para armazenamento dos PDFs de contrato (se ainda não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comodato-contratos', 'comodato-contratos', false)
ON CONFLICT (id) DO NOTHING;

-- Política: usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload comodato contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comodato-contratos');

-- Política: usuários autenticados podem ler
CREATE POLICY "Authenticated users can read comodato contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comodato-contratos');

-- Política: usuários autenticados podem atualizar (re-upload)
CREATE POLICY "Authenticated users can update comodato contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comodato-contratos');
