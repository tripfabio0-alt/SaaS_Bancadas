-- ──────────────────────────────────────────────────────────────────
-- View: consolidated_data
-- Joins bench metadata with technical test points
-- Filtered by 'qmax' test points by default for reporting
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.consolidated_data AS
SELECT 
    d.id as data_id,
    d.composite_id,
    d."ID Mark",
    d.bancada_id,
    d."Meter Number",
    d."Error conclusion",
    d."Save time",
    d.timestamp as main_timestamp,
    f.raw_payload,
    -- Extract common technical fields for easier access
    f.raw_payload->>'Test point' as test_point,
    f.raw_payload->>'Flow rate' as flow_rate,
    f.raw_payload->>'Temperature' as temperature,
    f.raw_payload->>'Pressure' as pressure,
    f.sync_at as last_sync
FROM 
    public.data d
JOIN 
    public.full_data f ON d.composite_id = f.composite_id
WHERE 
    f.raw_payload->>'Test point' ILIKE '%qmax%';

-- Grant access to the view
ALTER VIEW public.consolidated_data OWNER TO postgres;
GRANT SELECT ON public.consolidated_data TO anon;
GRANT SELECT ON public.consolidated_data TO authenticated;
GRANT SELECT ON public.consolidated_data TO service_role;

COMMENT ON VIEW public.consolidated_data IS 'Visão consolidada unindo metadados e dados técnicos filtrados por qmax.';
