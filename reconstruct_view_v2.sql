-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V10.0: COMPLETUDE INDUSTRIAL TOTAL
-- ==========================================================
-- Este script expande a View global_uniao para extrair TODOS
-- os parâmetros técnicos importantes (Qmax, Qmin, Perda de Carga)
-- e consolidar a correlação com o Relatorio.csv (Lote).

-- 1. Permissões Globais
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View de Correlação (INDUSTRIAL MASTER VIEW)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
SELECT 
    -- 1. Mapeamento de ALIASES (Essenciais para o Dash)
    d."Save time" as data_hora,
    d."Meter Number" as meter_number,
    d."ID Mark" as id_mark,
    d."Error conclusion" as status_resultado,
    d."note" as observacao,
    
    -- 2. Dados Técnicos Expandidos (Extração profunda do JSON)
    f.raw_payload as tech_raw,
    COALESCE(f.raw_payload->>'temperatura_celcius', f.raw_payload->>'Labtemperature', f.raw_payload->>'Temperature') as temperatura_celcius,
    COALESCE(f.raw_payload->>'umidade_percentual', f.raw_payload->>'Humidity', f.raw_payload->>'RH') as umidade_percentual,
    
    -- Vazões e Pontos de Teste (Qmax, Qmin, Qn)
    COALESCE(f.raw_payload->>'qmax', f.raw_payload->>'Qmax', f.raw_payload->>'Q-max') as qmax,
    COALESCE(f.raw_payload->>'qmin', f.raw_payload->>'Qmin', f.raw_payload->>'Q-min') as qmin,
    COALESCE(f.raw_payload->>'qn', f.raw_payload->>'Qn', f.raw_payload->>'Q-nominal') as qn,
    COALESCE(f.raw_payload->>'ponto_teste', f.raw_payload->>'Test point', f.raw_payload->>'Q') as ponto_teste,
    
    -- Pressão e Perda de Carga
    COALESCE(f.raw_payload->>'perda_carga', f.raw_payload->>'Pres loss value', f.raw_payload->>'Pressure loss', f.raw_payload->>'Mech pres loss value') as perda_carga,
    COALESCE(f.raw_payload->>'pressao_pa', f.raw_payload->>'Pressure', f.raw_payload->>'P') as pressao_pa,
    
    -- Erros e Vazão Real
    COALESCE(f.raw_payload->>'vazao_real', f.raw_payload->>'Flow rate', f.raw_payload->>'Flow') as vazao_real,
    COALESCE(f.raw_payload->>'erro_relativo', f.raw_payload->>'Relative Error', f.raw_payload->>'Error') as erro_relativo,
    COALESCE(f.raw_payload->>'wme_value', f.raw_payload->>'WME', f.raw_payload->>'Weighted Mean Error') as wme_value,
    
    -- 3. Dados de Lote (Tabela Relatorio.csv / vínculo_lacre)
    cl.lote_produto as csv_lote,
    cl.lacre as csv_lacre,
    cl.tipo as csv_tipo,
    cl.cod_inmetro as csv_cod_inmetro,
    cl.lote_inmetro as csv_lote_inmetro,
    cl.data_vinculo as csv_data_vinculo,

    -- 4. Trazer tudo do Data (d.*) para compatibilidade completa
    d.*

FROM public.data d
-- JOIN Full Data: Cruzamento via ID Mark
LEFT JOIN public.full_data f ON (UPPER(TRIM(d."ID Mark")) = UPPER(TRIM(f."ID Mark")))
-- JOIN CSV: Cruzamento via Meter Number contra Lote (Conforme solicitado)
LEFT JOIN public.vinculo_lacre cl ON (UPPER(TRIM(d."Meter Number")) = UPPER(TRIM(cl.lote_produto)));

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
