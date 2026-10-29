-- Añade el almacenamiento anual de jornada antes de publicar la v2.20.0.
-- No modifica la configuración anterior, los meses, los fichajes ni las políticas RLS.
BEGIN;

ALTER TABLE public.config
  ADD COLUMN IF NOT EXISTS jornada_anual jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'config'
  AND column_name = 'jornada_anual';
