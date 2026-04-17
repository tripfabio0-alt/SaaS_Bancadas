-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V2.2: Compatibilidade de Esquema Real
-- ==========================================================
-- Este script usa os nomes exatos das colunas detectados no seu 
-- Banco de Dados atual para garantir 100% de sucesso na criação da view.

-- 1. Permissões de Leitura
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View com Nomes de Coluna Originais (Case-Sensitive)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    d.composite_id,
    d.bancada_id,
    d."ID Mark" as id_mark,
    TRIM(d."Meter Number") as meter_number,
    d."Error conclusion" as status_resultado,
    d."Save time" as data_hora,
    d.note as observacao,
    cl.lote_produto,
    cl.lacre,
    cl.data_vinculo as csv_data_vinculo,
    cl.cod_lacre,
    cl.seq_lote,
    cl.cod_inmetro,
    cl.lote_inmetro,
    -- Dados Técnicos (Do Payload JSON no full_data)
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'test_point', f.raw_payload->>'ponto') as ponto_teste,
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'flow_rate', f.raw_payload->>'vazao') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'error_relativo', f.raw_payload->>'erro') as erro_relativo,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'temperature', f.raw_payload->>'temperatura') as temperatura_celcius,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'pressure', f.raw_payload->>'pressao') as pressao_pa,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'umidade') as umidade_percentual,
    COALESCE(f.raw_payload->>'status_tecnico', f.raw_payload->>'status') as status_tecnico
FROM public.data d
LEFT JOIN public.vinculo_lacre cl ON UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lacre))
LEFT JOIN public.full_data f ON d.composite_id = f.composite_id;

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
