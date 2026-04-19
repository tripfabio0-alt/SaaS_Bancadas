-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V7.0: PONTE DE DADOS DEFINITIVA
-- ==========================================================
-- Este script realiza o aliasing (apelido) das colunas originais 
-- do Access para os nomes esperados pelo Dashboard do SaaS.
-- Isso resolve o erro de carregamento que impedia a exibição dos dados.

-- 1. Permissões Globais
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View de Correlação (STABLE BRIDGE)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    -- 1. Mapeamento de ALIASES (Tradução Access -> SaaS)
    d."Save time" as data_hora,
    d."Meter Number" as meter_number,
    d."ID Mark" as id_mark,
    d."Error conclusion" as status_resultado,
    d."note" as observacao,
    d.bancada_id,
    d.composite_id,
    
    -- 2. Dados Técnicos (Tabela Full Data - Achatamento JSON)
    f.raw_payload as tech_raw,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'Labtemperature', f.raw_payload->>'Temperature') as temperatura_celcius,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'Humidity', f.raw_payload->>'RH') as umidade_percentual,
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'Test point', f.raw_payload->>'Q') as ponto_teste,
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'Flow rate', f.raw_payload->>'Flow') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'Relative Error', f.raw_payload->>'Error') as erro_relativo,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'Pressure', f.raw_payload->>'P') as pressao_pa,
    
    -- 3. Dados de Lote (Tabela Relatorio.csv / vínculo_lacre)
    cl.lote_produto as csv_lote,
    cl.lacre as csv_lacre,
    cl.tipo as csv_tipo,
    cl.cod_inmetro as csv_cod_inmetro,
    cl.lote_inmetro as csv_lote_inmetro,
    cl.data_vinculo as csv_data_vinculo,

    -- 4. Trazer tudo do Data (d.*) para garantir campos dinâmicos não mapeados
    d.*

FROM public.data d
-- JOIN Full Data: Cruzamento via ID Mark (Forte)
LEFT JOIN public.full_data f ON (UPPER(TRIM(d."ID Mark")) = UPPER(TRIM(f."ID Mark")))
-- JOIN CSV: Cruzamento via Meter Number contra Lote (Padrão Industrial)
LEFT JOIN public.vinculo_lacre cl ON (UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lote_produto)));

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
