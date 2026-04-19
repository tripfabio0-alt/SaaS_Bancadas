-- ==========================================================
-- SCRIPT DE RECONSTRUÇÃO V4.0: ENGINE DE INTELIGÊNCIA INDUSTRIAL
-- ==========================================================
-- Este script implementa toda a lógica matemática de cálculos (EMP),
-- mapeamento de vazão (G-Size) e sinal de status conforme o padrão
-- utilizado no banco Access local do laboratório.

-- 1. Permissões Globais
GRANT SELECT ON public.data TO anon, authenticated, service_role;
GRANT SELECT ON public.full_data TO anon, authenticated, service_role;
GRANT SELECT ON public.vinculo_lacre TO anon, authenticated, service_role;
GRANT SELECT ON public.app_config TO anon, authenticated, service_role;

-- 2. Recriação da View Consolidada (LOGIC ENGINE)
DROP VIEW IF EXISTS public.global_uniao;

CREATE VIEW public.global_uniao AS
WITH base_data AS (
    SELECT 
        d.*,
        f.raw_payload as tech_payload,
        -- Mapeamento de Vazão Baseado no "G Size"
        CASE 
            WHEN d."G Size" = 'G0.6' THEN 1000
            WHEN d."G Size" = 'G1'   THEN 1600
            WHEN d."G Size" = 'G1.6' THEN 2500
            WHEN d."G Size" = 'G2.5' THEN 4000
            WHEN d."G Size" = 'G4'   THEN 6000
            WHEN d."G Size" = 'G6'   THEN 10000
            WHEN d."G Size" = 'G10'  THEN 16000
            WHEN d."G Size" = 'G16'  THEN 25000
            WHEN d."G Size" = 'G25'  THEN 40000
            ELSE 0 
        END as v_max,
        -- Fallbacks Climáticos do Access
        COALESCE(CAST(f.raw_payload->>'temperatura_celcius' AS FLOAT), CAST(d."Labtemperature" AS FLOAT), 20.0) as temp_final,
        COALESCE(CAST(f.raw_payload->>'umidade_percentual' AS FLOAT), CAST(d."Humidity" AS FLOAT), 50.0) as hum_final
    FROM public.data d
    LEFT JOIN public.full_data f ON (UPPER(TRIM(d.composite_id)) = UPPER(TRIM(f.composite_id)))
),
calc_data AS (
    SELECT 
        *,
        -- Vazões Med e Min
        v_max * 0.2 as v_med,
        CASE 
            WHEN "G Size" IN ('G0.6', 'G1', 'G1.6') THEN 16
            WHEN "G Size" = 'G2.5' THEN 25
            WHEN "G Size" = 'G4' THEN 40
            WHEN "G Size" = 'G6' THEN 60
            WHEN "G Size" = 'G10' THEN 100
            WHEN "G Size" = 'G16' THEN 160
            WHEN "G Size" = 'G25' THEN 250
            ELSE 0 
        END as v_min,
        -- Erros Qmax, QMed, QMin
        COALESCE(CAST("Error Qmax" AS FLOAT), 100.0) as qmax1,
        COALESCE(CAST("Error 02Qmax" AS FLOAT), 100.0) as qmed1,
        COALESCE(CAST("Error Qmin" AS FLOAT), 100.0) as qmin1
    FROM base_data
),
emp_engine AS (
    SELECT 
        *,
        -- Pesos Ki (Simplificado do SQL do Access: 0.4 se > 70% ou 1.0)
        CASE WHEN v_max > (v_max * 0.7) THEN 0.4 ELSE 1.0 END as ki_max,
        CASE WHEN v_med > (v_max * 0.7) THEN 0.4 ELSE 1.0 END as ki_med,
        CASE WHEN v_min > (v_max * 0.7) THEN 0.4 ELSE 1.0 END as ki_min
    FROM calc_data
)
SELECT 
    -- 1. Dados de Identificação e Core
    e.composite_id,
    e.bancada_id,
    e."ID Mark" as id_mark,
    TRIM(e."Meter Number") as meter_number,
    e."Error conclusion" as status_resultado,
    e."Save time" as data_hora,
    e.note as observacao,
    
    -- 2. Cálculos Industriais (EMP)
    ROUND(CAST((e.ki_max * e.qmax1 + e.ki_med * e.qmed1 + e.ki_min * e.qmin1) / NULLIF((e.ki_max + e.ki_med + e.ki_min), 0) AS NUMERIC), 2) as emp_valor,
    CASE WHEN ABS((e.ki_max * e.qmax1 + e.ki_med * e.qmed1 + e.ki_min * e.qmin1) / NULLIF((e.ki_max + e.ki_med + e.ki_min), 0)) <= 0.6 THEN 'OK' ELSE 'NK' END as emp_status,
    
    -- 3. Dados Técnicos e Mapeamento G-Size
    e."G Size" as g_size,
    e.v_max as vazao_maxima,
    e.v_med as vazao_media,
    e.v_min as vazao_minima,
    e.qmax1 as erro_qmax,
    e.qmed1 as erro_qmed,
    e.qmin1 as erro_qmin,
    
    -- 4. Climatização (Com Fallback Industrial)
    e.temp_final as temperatura_lab,
    e.hum_final as umidade_lab,
    
    -- 5. Cruzamento com CSV (Relatório Tecnicon)
    cl.lote_produto,
    cl.lacre,
    cl.data_vinculo as csv_data_vinculo,
    cl.cod_inmetro,
    cl.lote_inmetro,

    -- 6. Metadados e Infra
    e.sync_at as data_sincronismo,
    e."Pres loss value" as perda_pressao,
    e."WME result" as wme_result
    
FROM emp_engine e
-- JOIN CSV: Cruzamento por 'Meter Number' = 'lote_produto' (Conforme SQL Access v2)
LEFT JOIN public.vinculo_lacre cl ON (UPPER(TRIM(e."Meter Number")) = UPPER(TRIM(cl.lote_produto)));

-- 3. Garantir Permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated, service_role;
