-- 1. Atualizar a View Global União para incluir WME e Umidade
DROP VIEW IF EXISTS public.global_uniao;
CREATE OR REPLACE VIEW public.global_uniao AS
SELECT 
    d.id,
    d.composite_id,
    d."ID Mark" as id_mark_bancada,
    d.bancada_id,
    d."Meter Number" as meter_number,
    d."Error conclusion" as status_resultado,
    d."Save time" as data_access,
    d.timestamp as data_hora,
    d.note as observacao,
    -- Campos do CSV
    vl.cod_lacre,
    vl.lacre,
    vl.data_vinculo as csv_data_vinculo,
    vl.seq_lote,
    vl.tipo as csv_tipo,
    vl.lote_produto,
    vl.cod_inmetro,
    vl.lote_inmetro,
    -- Dados Técnicos Explodidos (Canonical Keys)
    (fd.raw_payload->>'test_point') as ponto_teste,
    (fd.raw_payload->>'flow_rate') as vazao_real,
    (fd.raw_payload->>'error_relativo') as erro_relativo,
    (fd.raw_payload->>'temperature') as temperatura_celcius,
    (fd.raw_payload->>'pressure') as pressao_pa,
    (fd.raw_payload->>'status_tecnico') as status_tecnico,
    -- NOVOS CAMPOS STITCH
    (fd.raw_payload->>'wme') as wme_value,
    (fd.raw_payload->>'umidade') as umidade_percentual,
    fd.raw_payload as technical_payload_full
FROM public.data d
LEFT JOIN public.full_data fd ON d.composite_id = fd.composite_id
LEFT JOIN public.vinculo_lacre vl ON d."Meter Number" = vl.lacre;

GRANT SELECT ON public.global_uniao TO anon, authenticated;
