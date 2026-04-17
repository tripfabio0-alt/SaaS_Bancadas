-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V2.1: Correção de Case-Sensitivity
-- ==========================================================
-- Este script corrige os nomes das colunas para minúsculas,
-- resolvendo o erro de "column does not exist" no PostgreSQL.

-- 1. Permissões de Leitura
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View de Unificação com Colunas em Minúsculas
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    d.composite_id,
    d.bancada_id,
    d."id_mark" as id_mark,
    TRIM(d."meter_number") as meter_number,
    d."error_conclusion" as status_resultado,
    d."save_time" as data_hora,
    d."note" as observacao,
    cl.lote_produto,
    cl.lacre,
    cl.data_vinculo as csv_data_vinculo,
    cl.cod_lacre,
    cl.seq_lote,
    cl.cod_inmetro,
    cl.lote_inmetro,
    -- Dados Técnicos (Payload do full_data)
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'test_point') as ponto_teste,
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'flow_rate') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'error_relativo') as erro_relativo,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'temperature') as temperatura_celcius,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'pressure') as pressao_pa,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'umidade') as umidade_percentual,
    (f.raw_payload->>'status_tecnico') as status_tecnico
FROM public.data d
LEFT JOIN public.vinculo_lacre cl ON UPPER(TRIM(d."meter_number")) = UPPER(TRIM(cl.lacre))
LEFT JOIN public.full_data f ON d.composite_id = f.composite_id;

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
