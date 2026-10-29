-- Ejecutar en el proyecto de Supabase de Fichajes antes de publicar la v2.19.0.
-- Conserva las bolsas anteriores en telet1..telet4 y no modifica fichajes.
BEGIN;

ALTER TABLE public.config
  ADD COLUMN IF NOT EXISTS teletrabajo_anual jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'config'
  AND column_name = 'teletrabajo_anual';
