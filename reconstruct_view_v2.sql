-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V2: Correlação Industrial Total
-- ==========================================================
-- Este script resolve a falha de correlação entre o Access (Data) 
-- e o Relatório CSV (Lote) garantindo que espaços e letras não
-- impeçam a união dos 341.000 registros.

-- 1. Permissões de Leitura (Garantir acesso do SaaS)
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View de Unificação com Lógica Robusta
-- O segredo aqui é o TRIM() e UPPER() nas chaves de junção.
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    d.composite_id,
    d.bancada_id,
    d."ID Mark" as id_mark,
    TRIM(d."Meter Number") as meter_number,
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
    -- Dados Técnicos (Payload do full_data)
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'test_point') as ponto_teste,
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'flow_rate') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'error_relativo') as erro_relativo,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'temperature') as temperatura_celcius,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'pressure') as pressao_pa,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'umidade') as umidade_percentual,
    (f.raw_payload->>'status_tecnico') as status_tecnico
FROM public.data d
LEFT JOIN public.vinculo_lacre cl ON UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lacre))
LEFT JOIN public.full_data f ON d.composite_id = f.composite_id;

-- 3. Garantir Permissões na Nova View
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;

-- 4. Comentário de Suporte
COMMENT ON VIEW public.global_uniao IS 'View consolidada que correlaciona Access, CSV e Full technical payloads via chaves higienizadas.';
