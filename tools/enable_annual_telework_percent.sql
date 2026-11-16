-- Ejecutar en el proyecto de Supabase de Fichajes para habilitar el porcentaje
-- anual de teletrabajo. No modifica fichajes ni políticas RLS.
BEGIN;

ALTER TABLE public.config
  ADD COLUMN IF NOT EXISTS teletrabajo_porcentaje_anual jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'config'
  AND column_name = 'teletrabajo_porcentaje_anual';
