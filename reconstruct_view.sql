-- ==========================================================
-- RECONSTRUCTION SCRIPT: SaaS Bancadas Unified View
-- ==========================================================
-- 1. Grant Permissions (Ensures Dashboard can read tables)
ALTER TABLE public.data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read access on data" ON public.data;
CREATE POLICY "Allow anon read access on data" ON public.data FOR SELECT USING (true);

ALTER TABLE public.full_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read access on full_data" ON public.full_data;
CREATE POLICY "Allow anon read access on full_data" ON public.full_data FOR SELECT USING (true);

ALTER TABLE public.vinculo_lacre ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read access on vinculo_lacre" ON public.vinculo_lacre;
CREATE POLICY "Allow anon read access on vinculo_lacre" ON public.vinculo_lacre FOR SELECT USING (true);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read access on app_config" ON public.app_config;
CREATE POLICY "Allow anon read access on app_config" ON public.app_config FOR SELECT USING (true);

-- 2. Ensure initial config exists (ID=1)
INSERT INTO public.app_config (id, admin_settings, report_vars, updated_at)
VALUES (1, '{"visible_fields": ["meter_number", "lote_produto", "lacre", "status_resultado", "data_hora"]}', '{"default_test_point_filter": "qmax"}', now())
ON CONFLICT (id) DO NOTHING;

-- 3. Reconstruct Unification View (global_uniao)
-- This view joins access logs with CSV batch data and technical payloads.
DROP VIEW IF EXISTS public.global_uniao;
CREATE OR REPLACE VIEW public.global_uniao AS
SELECT 
    d.composite_id,
    d.bancada_id,
    d."ID Mark" as id_mark,
    d."Meter Number" as meter_number,
    d."Error conclusion" as status_resultado,
    d."Save time" as data_hora,
    d."Note" as observacao,
    cl.lote_produto,
    cl.lacre,
    cl.data_vinculo as csv_data_vinculo,
    cl.cod_lacre,
    cl.seq_lote,
    cl.cod_inmetro,
    cl.lote_inmetro,
    -- Technical Data from Payload (full_data)
    (f.raw_payload->>'ponto_teste') as ponto_teste,
    (f.raw_payload->>'vazao_real') as vazao_real,
    (f.raw_payload->>'erro_relativo') as erro_relativo,
    (f.raw_payload->>'temperatura_celcius') as temperatura_celcius,
    (f.raw_payload->>'pressao_pa') as pressao_pa,
    (f.raw_payload->>'umidade_percentual') as umidade_percentual,
    (f.raw_payload->>'wme_value') as wme_value,
    (f.raw_payload->>'status_tecnico') as status_tecnico
FROM public.data d
LEFT JOIN public.vinculo_lacre cl ON d."Meter Number" = cl.lacre
LEFT JOIN public.full_data f ON d.composite_id = f.composite_id;

-- 4. Final read permissions for the view
GRANT SELECT ON public.global_uniao TO anon;
GRANT SELECT ON public.global_uniao TO authenticated;
GRANT SELECT ON public.global_uniao TO service_role;
