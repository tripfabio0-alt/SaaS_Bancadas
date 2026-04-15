-- ──────────────────────────────────────────────────────────────────
-- Table: app_config
-- Stores SaaS-level configurations for Admin (Field visibility, global filters, etc.)
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    admin_settings JSONB NOT NULL DEFAULT '{
        "visible_fields": [
            "ID Mark", 
            "Meter Number", 
            "Error conclusion", 
            "Save time", 
            "test_point", 
            "flow_rate", 
            "temperature"
        ],
        "downtime_threshold_minutes": 30
    }',
    report_vars JSONB NOT NULL DEFAULT '{
        "default_test_point_filter": "qmax"
    }',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row_only CHECK (id = 1)
);

-- Initial Seed
INSERT INTO public.app_config (id, admin_settings, report_vars)
VALUES (1, DEFAULT, DEFAULT)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
ALTER TABLE public.app_config OWNER TO postgres;
GRANT ALL ON public.app_config TO anon;
GRANT ALL ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

COMMENT ON TABLE public.app_config IS 'Configurações globais do SaaS — Gerenciadas pelo Admin.';
