-- Ejecutar en Supabase ANTES de desplegar el backend de esta rama.
-- Compatible con cadenas históricas: no cambia estados ni acredita puntos.
BEGIN;
ALTER TABLE cadena_intercambio ADD COLUMN IF NOT EXISTS intercambio_iniciado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cadena_paso ADD COLUMN IF NOT EXISTS recibido BOOLEAN NOT NULL DEFAULT FALSE;
COMMIT;
-- Las cadenas duplicadas activas se consolidan al listar o actuar sobre ellas.
-- Se conservan las aceptaciones; los registros repetidos quedan cancelados.
