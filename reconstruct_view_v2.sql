-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V3.4: EXAUSTÃO TÉCNICA TOTAL
-- ==========================================================
-- Este script expande a detecção automática de campos para cobrir
-- absolutamente todos os mapeamentos possíveis do Access para o SaaS.

-- 1. Permissões Globais
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View Consolidada (ULTIMATE TECH)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    -- Chaves de Identificação
    d.composite_id,
    d.bancada_id,
    d."ID Mark" as id_mark,
    TRIM(d."Meter Number") as meter_number,
    
    -- Status e Tempo (Data Principal)
    d."Error conclusion" as status_resultado,
    d."Save time" as data_hora,
    d.note as observacao,
    d.sync_at as data_sincronismo,

    -- Dados do Relatório CSV (Cruzamento por Lacre)
    cl.lote_produto,
    cl.lacre,
    cl.data_vinculo as csv_data_vinculo,
    cl.cod_lacre,
    cl.seq_lote,
    cl.cod_inmetro,
    cl.lote_inmetro,

    -- Dados Técnicos (Exaustão de Mapeamento JSON)
    COALESCE(
        f.raw_payload->>'temperatura_celcius', 
        f.raw_payload->>'temperature', 
        f.raw_payload->>'temperatura',
        f.raw_payload->>'Labtemperature',
        f.raw_payload->>'Temp',
        f.raw_payload->>'T'
    ) as temperatura_celcius,
    
    COALESCE(
        f.raw_payload->>'umidade_percentual', 
        f.raw_payload->>'umidade', 
        f.raw_payload->>'humidity',
        f.raw_payload->>'RH',
        f.raw_payload->>'Umid',
        f.raw_payload->>'H'
    ) as umidade_percentual,
    
    COALESCE(
        f.raw_payload->>'ponto_teste', 
        f.raw_payload->>'test_point', 
        f.raw_payload->>'ponto',
        f.raw_payload->>'Q'
    ) as ponto_teste,
    
    COALESCE(
        f.raw_payload->>'vazao_real', 
        f.raw_payload->>'flow_rate', 
        f.raw_payload->>'vazao',
        f.raw_payload->>'Flow'
    ) as vazao_real,
    
    COALESCE(
        f.raw_payload->>'erro_relativo', 
        f.raw_payload->>'relative_error', 
        f.raw_payload->>'erro',
        f.raw_payload->>'percentage_error',
        f.raw_payload->>'Error'
    ) as erro_relativo,
    
    COALESCE(
        f.raw_payload->>'pressao_pa', 
        f.raw_payload->>'pressure', 
        f.raw_payload->>'pressao',
        f.raw_payload->>'Labpressure',
        f.raw_payload->>'P'
    ) as pressao_pa,
    
    COALESCE(
        f.raw_payload->>'wme_value', 
        f.raw_payload->>'weighted_error', 
        f.raw_payload->>'weighted_mean_error',
        f.raw_payload->>'wme',
        f.raw_payload->>'Weighted_Mean_Error'
    ) as wme_value,
    
    COALESCE(
        f.raw_payload->>'status_tecnico', 
        f.raw_payload->>'status',
        f.raw_payload->>'Tech Status'
    ) as status_tecnico
    
FROM public.data d
LEFT JOIN public.vinculo_lacre cl ON (UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lacre)))
LEFT JOIN public.full_data f ON (UPPER(TRIM(d.composite_id)) = UPPER(TRIM(f.composite_id)));

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
