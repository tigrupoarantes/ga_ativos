-- ================================================================
-- Migration: Check-in/Check-out de KM via App Mobile para Motoristas
-- ================================================================

-- 1. Extender constraint de source para incluir 'app'
ALTER TABLE public.vehicle_odometer_reports
  DROP CONSTRAINT IF EXISTS vehicle_odometer_reports_source_check;

ALTER TABLE public.vehicle_odometer_reports
  ADD CONSTRAINT vehicle_odometer_reports_source_check
  CHECK (source IN ('whatsapp', 'manual', 'app'));

-- 2. Coluna report_type (checkin / checkout)
ALTER TABLE public.vehicle_odometer_reports
  ADD COLUMN IF NOT EXISTS report_type TEXT
    CHECK (report_type IN ('checkin', 'checkout'));

-- 3. Coluna photo_url para armazenar URL da foto do hodômetro
ALTER TABLE public.vehicle_odometer_reports
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 4. Coluna km_diff (checkout_km - checkin_km do mesmo dia; null para checkins)
ALTER TABLE public.vehicle_odometer_reports
  ADD COLUMN IF NOT EXISTS km_diff INT;

-- 5. Índice de performance para consultas da tela do motorista
CREATE INDEX IF NOT EXISTS idx_odometer_vehicle_type_date
  ON public.vehicle_odometer_reports (vehicle_id, report_type, reported_at DESC);

-- 6. Storage bucket para fotos de hodômetro (privado, 5MB máx)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'odometer-photos',
  'odometer-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 7. RLS Storage: usuários autenticados podem fazer upload
CREATE POLICY "Upload odometer photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'odometer-photos');

-- 8. RLS Storage: usuários autenticados podem visualizar
CREATE POLICY "View odometer photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'odometer-photos');

-- 9. RLS Storage: usuários podem deletar apenas seus próprios uploads
CREATE POLICY "Delete own odometer photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'odometer-photos' AND owner = auth.uid());

-- 10. RLS insert: motoristas só inserem registros com seu próprio employee_id quando source='app'
--     Fluxos existentes (manual/whatsapp) não são afetados pela cláusula OR
CREATE POLICY "Motoristas insert app reports"
  ON public.vehicle_odometer_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    source != 'app'
    OR employee_id = (
      SELECT id FROM public.funcionarios
      WHERE user_id = auth.uid()
        AND is_condutor = true
      LIMIT 1
    )
  );

-- Notificar PostgREST para recarregar schema
NOTIFY pgrst, 'reload schema';
