-- Ejecutar en Supabase antes de desplegar el backend de esta versión.
BEGIN;
ALTER TABLE public.libro ADD COLUMN IF NOT EXISTS paginas INTEGER;
ALTER TABLE public.libro ADD COLUMN IF NOT EXISTS categoria_referencia VARCHAR(255);
COMMIT;
