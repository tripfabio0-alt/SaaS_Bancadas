-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V5.0: UNIFICAÇÃO INDÚSTRIAL DEFINITIVA
-- ==========================================================
-- Este script realiza a correlação total das 3 fontes de dados:
-- 1. Data (Meta-dados principais do Access)
-- 2. Full Data (Dados técnicos de sensores e pontos de teste)
-- 3. Relatorio.csv (Dados de lote e vinculação industrial)

-- 1. Permissões Globais
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View de Correlação (MASTER CORRELATION)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    -- 1. Dados Base (Tabela Data)
    d.*, -- Inclui todas as colunas sincronizadas pelo v11.0
    
    -- 2. Dados Técnicos (Tabela Full Data - Achatamento JSON)
    f.raw_payload as tech_raw,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'Labtemperature') as temperatura_celcius,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'Humidity') as umidade_percentual,
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'Test point') as ponto_teste,
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'Flow rate') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'Relative Error') as erro_relativo,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'Pressure') as pressao_pa,
    
    -- 3. Dados de Lote (Tabela Relatorio.csv / vínculo_lacre)
    cl.lote_produto as csv_lote,
    cl.lacre as csv_lacre,
    cl.tipo as csv_tipo,
    cl.cod_lacre as csv_cod_lacre,
    cl.seq_lote as csv_seq_lote,
    cl.cod_inmetro as csv_cod_inmetro,
    cl.lote_inmetro as csv_lote_inmetro,
    cl.data_vinculo as csv_data_vinculo

FROM public.data d
-- Relacionamento 1: Data + Full Data (Baseado no ID Mark do ensaio)
LEFT JOIN public.full_data f ON (UPPER(TRIM(d.composite_id)) = UPPER(TRIM(f.composite_id)))
-- Relacionamento 2: Data + Relatorio.csv (Cruzamento pelo Número do Medidor / Lacre)
LEFT JOIN public.vinculo_lacre cl ON (UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lacre)));

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
