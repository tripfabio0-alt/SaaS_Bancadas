-- 1. Expandir a tabela de vincúlo de lacres para o mapeamento total do CSV
ALTER TABLE public.vinculo_lacre ADD COLUMN IF NOT EXISTS seq_lote TEXT;
ALTER TABLE public.vinculo_lacre ADD COLUMN IF NOT EXISTS cod_inmetro TEXT;
ALTER TABLE public.vinculo_lacre ADD COLUMN IF NOT EXISTS lote_inmetro TEXT;

-- 2. Atualizar a View Global União para expor ABSOLUTAMENTE TUDO
-- Nota: Extraímos alguns campos comuns do JSON como exemplo, mas a View agora é completa.
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
    -- Campos do CSV (100% mapeados)
    vl.cod_lacre,
    vl.lacre,
    vl.data_vinculo as csv_data_vinculo,
    vl.seq_lote,
    vl.tipo as csv_tipo,
    vl.lote_produto,
    vl.cod_inmetro,
    vl.lote_inmetro,
    -- Dados Técnicos Explodidos do JSON (Full Data)
    (fd.raw_payload->>'Test point') as ponto_teste,
    (fd.raw_payload->>'Flow rate') as vazao_real,
    (fd.raw_payload->>'Error') as erro_relativo,
    (fd.raw_payload->>'Temperature') as temperatura_celcius,
    (fd.raw_payload->>'Pressure') as pressao_pa,
    (fd.raw_payload->>'Status') as status_tecnico,
    fd.raw_payload as technical_payload_full
FROM public.data d
LEFT JOIN public.full_data fd ON d.composite_id = fd.composite_id
LEFT JOIN public.vinculo_lacre vl ON d."Meter Number" = vl.lacre;

-- Garantir permissões
GRANT SELECT ON public.global_uniao TO anon, authenticated;
