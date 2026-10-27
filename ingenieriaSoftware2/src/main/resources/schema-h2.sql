-- Solo para H2 (desarrollo local). En Supabase estos tipos son ENUM nativos (ver schema.sql).
-- Hibernate usa estos nombres en columnDefinition, asi que H2 necesita que existan.
CREATE DOMAIN IF NOT EXISTS estado_intercambio AS VARCHAR(50);
CREATE DOMAIN IF NOT EXISTS tipo_movimiento AS VARCHAR(50);
CREATE DOMAIN IF NOT EXISTS tipo_notificacion AS VARCHAR(50);
