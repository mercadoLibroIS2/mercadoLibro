BEGIN;

-- ============================================================
-- 0. LIMPIEZA
-- ============================================================
DROP VIEW IF EXISTS public.movimiento_puntos CASCADE;

DROP TABLE IF EXISTS
    public.movimiento_puntos_sistema,
    public.movimiento_puntos_resena,
    public.movimiento_puntos_compra,
    public.movimiento_puntos_intercambio,
    public.evento_sistema,
    public.notificacion,
    public.publicacion_historial_precio,
    public."usuario_id",              -- tabla errónea de versiones previas (debía ser clasificado_en)
    public.clasificado_en,
    public.lista,
    public.cartel_mal_intercambiador,
    public.bajar_calificacion,
    public.baneo,
    public.reporte,
    public.resena,
    public.cadena,
    public.intercambio,
    public.compra,
    public.publicacion,
    public.categoria,
    public.libro_metadata_cache,
    public.usuario
CASCADE;

-- Funciones: se borran todas las sobrecargas (versiones previas tenían firmas varchar/bigint).
-- CASCADE elimina también cualquier trigger que las use (incluido el de auth.users).
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'fn_actualizar_reputacion', 'fn_alta_inicial_automatica',
            'fn_aplicar_movimiento_puntos', 'fn_cadena_bloquear_reversion',
            'fn_calcular_color_semaforo', 'fn_evitar_ciclo_categoria',
            'fn_intercambio_actualizar_publicaciones',
            'fn_publicacion_notificar_seguidores', 'fn_puntos_alta_inicial',
            'fn_recalcular_reputacion', 'fn_reporte_generar_sancion',
            'fn_resena_reviewed', 'fn_set_color_inicial',
            'fn_trackear_cambio_precio', 'fn_validar_resena',
            'fn_validar_sancion_disjunta',
            'fn_validar_usuario_movimiento_compra',
            'fn_validar_usuario_movimiento_intercambio',
            'handle_new_user'
          )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
    END LOOP;
END
$$;

DROP TYPE IF EXISTS
    estado_compra, tipo_evento_sistema, frecuencia_notificacion,
    tipo_notificacion, color_semaforo, estado_publicacion, estado_cadena,
    estado_reporte, motivo_reporte, entidad_reporte, calidad_resena,
    tipo_movimiento, estado_intercambio, calidad_libro, estado_cuenta,
    rol_usuario
CASCADE;

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE rol_usuario              AS ENUM ('ADMINISTRADOR', 'USUARIO');
CREATE TYPE estado_cuenta            AS ENUM ('ACTIVA', 'SUSPENDIDA', 'BANEADA');
CREATE TYPE calidad_libro            AS ENUM ('NUEVO', 'COMO_NUEVO', 'BUENO', 'ACEPTABLE', 'MALO');
CREATE TYPE estado_intercambio       AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO');
CREATE TYPE estado_compra            AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA');
CREATE TYPE tipo_movimiento          AS ENUM ('INGRESO', 'EGRESO', 'RESERVA', 'LIBERACION_RESERVA', 'DEVOLUCION');
CREATE TYPE calidad_resena           AS ENUM ('POSITIVA', 'NEGATIVA');
CREATE TYPE entidad_reporte          AS ENUM ('USUARIO', 'PUBLICACION', 'INTERCAMBIO');
CREATE TYPE motivo_reporte           AS ENUM ('MAL_ESTADO_LIBRO', 'INCUMPLIMIENTO_INTERCAMBIO', 'FRAUDE', 'COMPORTAMIENTO_INADECUADO', 'OTRO');
CREATE TYPE estado_reporte           AS ENUM ('PENDIENTE', 'EN_REVISION', 'RESUELTO', 'RECHAZADO');
CREATE TYPE estado_cadena            AS ENUM ('ACTIVA', 'COMPLETADA', 'CANCELADA');
CREATE TYPE estado_publicacion       AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ELIMINADA');
CREATE TYPE color_semaforo           AS ENUM ('VERDE', 'AMARILLO', 'ROJO', 'SIN_REFERENCIA');
CREATE TYPE tipo_notificacion        AS ENUM ('PUBLICACION_NUEVA', 'BAJA_PRECIO', 'CRUCE_VERDE', 'OTRO');
CREATE TYPE frecuencia_notificacion  AS ENUM ('INSTANTANEA', 'DIARIA');
CREATE TYPE tipo_evento_sistema      AS ENUM ('ALTA_INICIAL', 'PROMOCION', 'AJUSTE_ADMIN', 'OTRO');

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- 2.1 USUARIO (id_usuario = auth.users.id de Supabase)
CREATE TABLE public.usuario (
    email                    varchar                  NOT NULL UNIQUE,
    id_usuario               uuid                     NOT NULL,
    nombre_usuario           varchar                  NOT NULL,
    rol                      rol_usuario              NOT NULL,
    saldo_total              numeric                  NOT NULL DEFAULT 0,
    saldo_reservado          numeric                  NOT NULL DEFAULT 0,
    reputacion_promedio      numeric,
    estado_cuenta            estado_cuenta            NOT NULL DEFAULT 'ACTIVA',
    notificacion_email       boolean                  NOT NULL DEFAULT true,
    notificacion_inapp       boolean                  NOT NULL DEFAULT true,
    frecuencia_notificacion  frecuencia_notificacion  NOT NULL DEFAULT 'INSTANTANEA',
    hora_resumen_diario      time,
    CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario),
    CONSTRAINT usuario_saldo_total_check CHECK (saldo_total >= 0),
    CONSTRAINT usuario_saldo_reservado_check
        CHECK (saldo_reservado >= 0 AND saldo_reservado <= saldo_total),
    CONSTRAINT usuario_reputacion_check
        CHECK (reputacion_promedio IS NULL OR reputacion_promedio BETWEEN 1 AND 5)
);

-- 2.2 LIBRO_METADATA_CACHE
CREATE TABLE public.libro_metadata_cache (
    isbn                       varchar(13) NOT NULL,
    google_books_id            varchar     NOT NULL UNIQUE,
    titulo                     varchar     NOT NULL,
    autores                    varchar,
    puntuacion_externa         numeric,
    fecha_cache_bibliografico  timestamp,
    fecha_cache_puntuacion     timestamp,
    CONSTRAINT libro_metadata_cache_pkey PRIMARY KEY (isbn),
    CONSTRAINT libro_metadata_cache_puntuacion_check
        CHECK (puntuacion_externa IS NULL OR puntuacion_externa BETWEEN 0 AND 5)
);

-- 2.3 CATEGORIA (auto-referenciada)
CREATE TABLE public.categoria (
    nombre              varchar NOT NULL,
    categoria_padre_id  varchar,
    CONSTRAINT categoria_pkey PRIMARY KEY (nombre),
    CONSTRAINT categoria_padre_fkey FOREIGN KEY (categoria_padre_id) REFERENCES public.categoria (nombre),
    CONSTRAINT categoria_no_autopadre_check
        CHECK (categoria_padre_id IS NULL OR categoria_padre_id <> nombre)
);

-- 2.4 PUBLICACION
CREATE TABLE public.publicacion (
    isbn                        varchar(13)     NOT NULL,
    propietario_id              uuid            NOT NULL,
    hora_de_publicacion         timestamp       NOT NULL,
    estado_fisico               calidad_libro   NOT NULL,
    valor_puntos_solicitado     bigint          NOT NULL,
    valor_referencia_calculado  bigint,
    comentario                  varchar,
    estado                      estado_publicacion NOT NULL DEFAULT 'DISPONIBLE',
    color_semaforo              color_semaforo  NOT NULL DEFAULT 'SIN_REFERENCIA',
    CONSTRAINT publicacion_pkey PRIMARY KEY (isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT publicacion_isbn_fkey FOREIGN KEY (isbn) REFERENCES public.libro_metadata_cache (isbn),
    CONSTRAINT publicacion_propietario_fkey FOREIGN KEY (propietario_id) REFERENCES public.usuario (id_usuario),
    CONSTRAINT publicacion_valor_solicitado_check CHECK (valor_puntos_solicitado >= 0),
    CONSTRAINT publicacion_valor_referencia_check
        CHECK (valor_referencia_calculado IS NULL OR valor_referencia_calculado >= 0)
);

-- 2.5 COMPRA (adquisición con puntos)
CREATE TABLE public.compra (
    comprador_id         uuid         NOT NULL,
    isbn                 varchar(13)  NOT NULL,
    propietario_id       uuid         NOT NULL,
    hora_de_publicacion  timestamp    NOT NULL,
    puntos               bigint       NOT NULL,
    estado               estado_compra NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT compra_pkey PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT compra_comprador_fkey FOREIGN KEY (comprador_id) REFERENCES public.usuario (id_usuario),
    CONSTRAINT compra_publicacion_fkey FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion (isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT compra_puntos_check CHECK (puntos > 0)
);

-- 2.6 INTERCAMBIO (directo)
CREATE TABLE public.intercambio (
    isbn_solicitante                 varchar(13)  NOT NULL,
    propietario_id_solicitante       uuid         NOT NULL,
    hora_de_publicacion_solicitante  timestamp    NOT NULL,
    isbn_ofrecida                    varchar(13)  NOT NULL,
    propietario_id_ofrecida          uuid         NOT NULL,
    hora_de_publicacion_ofrecida     timestamp    NOT NULL,
    estado                           estado_intercambio NOT NULL,
    puntos_comprometidos             numeric      NOT NULL DEFAULT 0,
    CONSTRAINT intercambio_pkey PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    CONSTRAINT intercambio_publicacion_solicitante_fkey
        FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        REFERENCES public.publicacion (isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT intercambio_publicacion_ofrecida_fkey
        FOREIGN KEY (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES public.publicacion (isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT intercambio_puntos_comprometidos_check CHECK (puntos_comprometidos >= 0),
    CONSTRAINT intercambio_propietarios_distintos_check
        CHECK (propietario_id_solicitante <> propietario_id_ofrecida),
    CONSTRAINT intercambio_publicaciones_distintas_check CHECK (
        (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        IS DISTINCT FROM
        (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida))
);

-- 2.7 CADENA (12 columnas de clave: dos intercambios completos)
CREATE TABLE public.cadena (
    isbn_solicitante_anterior                  varchar(13) NOT NULL,
    propietario_id_solicitante_anterior        uuid        NOT NULL,
    hora_de_publicacion_solicitante_anterior   timestamp   NOT NULL,
    isbn_ofrecida_anterior                     varchar(13) NOT NULL,
    propietario_id_ofrecida_anterior           uuid        NOT NULL,
    hora_de_publicacion_ofrecida_anterior      timestamp   NOT NULL,
    isbn_solicitante_siguiente                 varchar(13) NOT NULL,
    propietario_id_solicitante_siguiente       uuid        NOT NULL,
    hora_de_publicacion_solicitante_siguiente  timestamp   NOT NULL,
    isbn_ofrecida_siguiente                    varchar(13) NOT NULL,
    propietario_id_ofrecida_siguiente          uuid        NOT NULL,
    hora_de_publicacion_ofrecida_siguiente     timestamp   NOT NULL,
    estado                                     estado_cadena NOT NULL DEFAULT 'ACTIVA',
    CONSTRAINT cadena_pkey PRIMARY KEY (
        isbn_solicitante_anterior, propietario_id_solicitante_anterior, hora_de_publicacion_solicitante_anterior,
        isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior,
        isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente,
        isbn_ofrecida_siguiente, propietario_id_ofrecida_siguiente, hora_de_publicacion_ofrecida_siguiente),
    CONSTRAINT cadena_intercambio_anterior_fkey
        FOREIGN KEY (isbn_solicitante_anterior, propietario_id_solicitante_anterior, hora_de_publicacion_solicitante_anterior,
                     isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior)
        REFERENCES public.intercambio (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                                       isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    CONSTRAINT cadena_intercambio_siguiente_fkey
        FOREIGN KEY (isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente,
                     isbn_ofrecida_siguiente, propietario_id_ofrecida_siguiente, hora_de_publicacion_ofrecida_siguiente)
        REFERENCES public.intercambio (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                                       isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    -- el libro entregado en un eslabón es el libro solicitado en el siguiente
    CONSTRAINT cadena_continuidad_check CHECK (
        isbn_ofrecida_anterior = isbn_solicitante_siguiente
        AND propietario_id_ofrecida_anterior = propietario_id_solicitante_siguiente
        AND hora_de_publicacion_ofrecida_anterior = hora_de_publicacion_solicitante_siguiente)
);

-- 2.8 RESENA
-- solicitante_reviewer = TRUE  -> reseña quien es propietario_id_solicitante; reseñado = propietario_id_ofrecida
-- solicitante_reviewer = FALSE -> reseña quien es propietario_id_ofrecida;    reseñado = propietario_id_solicitante
CREATE TABLE public.resena (
    isbn_solicitante                 varchar(13)  NOT NULL,
    propietario_id_solicitante       uuid         NOT NULL,
    hora_de_publicacion_solicitante  timestamp    NOT NULL,
    isbn_ofrecida                    varchar(13)  NOT NULL,
    propietario_id_ofrecida          uuid         NOT NULL,
    hora_de_publicacion_ofrecida     timestamp    NOT NULL,
    solicitante_reviewer             boolean      NOT NULL,
    calificacion                     smallint     NOT NULL,
    comentario                       varchar,
    calidad                          calidad_resena,
    CONSTRAINT resena_pkey PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer),
    CONSTRAINT resena_intercambio_fkey
        FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                     isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES public.intercambio (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                                       isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    CONSTRAINT resena_calificacion_check CHECK (calificacion BETWEEN 1 AND 5)
);

-- 2.9 REPORTE y sanciones
CREATE TABLE public.reporte (
    reportante_id  uuid           NOT NULL,
    hora_reporte   timestamp      NOT NULL,
    reportado_id   uuid           NOT NULL,
    entidad_tipo   entidad_reporte NOT NULL,
    motivo         motivo_reporte NOT NULL,
    estado         estado_reporte NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT reporte_pkey PRIMARY KEY (reportante_id, hora_reporte, reportado_id),
    CONSTRAINT reporte_reportante_fkey FOREIGN KEY (reportante_id) REFERENCES public.usuario (id_usuario),
    CONSTRAINT reporte_reportado_fkey  FOREIGN KEY (reportado_id)  REFERENCES public.usuario (id_usuario),
    CONSTRAINT reporte_no_autoreporte_check CHECK (reportante_id <> reportado_id)
);

CREATE TABLE public.baneo (
    reportante_id  uuid      NOT NULL,
    hora_reporte   timestamp NOT NULL,
    reportado_id   uuid      NOT NULL,
    fecha_inicio   timestamp NOT NULL DEFAULT now(),
    fecha_fin      timestamp,
    CONSTRAINT baneo_pkey PRIMARY KEY (reportante_id, hora_reporte, reportado_id),
    CONSTRAINT baneo_reporte_fkey FOREIGN KEY (reportante_id, hora_reporte, reportado_id)
        REFERENCES public.reporte (reportante_id, hora_reporte, reportado_id)
);

CREATE TABLE public.bajar_calificacion (
    reportante_id  uuid      NOT NULL,
    hora_reporte   timestamp NOT NULL,
    reportado_id   uuid      NOT NULL,
    castigo        smallint,
    CONSTRAINT bajar_calificacion_pkey PRIMARY KEY (reportante_id, hora_reporte, reportado_id),
    CONSTRAINT bajar_calificacion_reporte_fkey FOREIGN KEY (reportante_id, hora_reporte, reportado_id)
        REFERENCES public.reporte (reportante_id, hora_reporte, reportado_id)
);

CREATE TABLE public.cartel_mal_intercambiador (
    reportante_id  uuid      NOT NULL,
    hora_reporte   timestamp NOT NULL,
    reportado_id   uuid      NOT NULL,
    cartel         boolean   NOT NULL DEFAULT true,
    CONSTRAINT cartel_mal_intercambiador_pkey PRIMARY KEY (reportante_id, hora_reporte, reportado_id),
    CONSTRAINT cartel_mal_intercambiador_reporte_fkey FOREIGN KEY (reportante_id, hora_reporte, reportado_id)
        REFERENCES public.reporte (reportante_id, hora_reporte, reportado_id)
);

-- 2.10 LISTA (seguimiento de libros)
CREATE TABLE public.lista (
    usuario_id              uuid          NOT NULL,
    isbn                    varchar(13)   NOT NULL,
    nota_privada            varchar,
    precio_min              bigint,
    precio_max              bigint,
    condiciones_aceptables  calidad_libro[],
    fecha_agregado          timestamp     NOT NULL DEFAULT now(),
    CONSTRAINT lista_pkey PRIMARY KEY (usuario_id, isbn),
    CONSTRAINT lista_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario (id_usuario),
    CONSTRAINT lista_isbn_fkey FOREIGN KEY (isbn) REFERENCES public.libro_metadata_cache (isbn),
    CONSTRAINT lista_precio_min_check CHECK (precio_min IS NULL OR precio_min >= 0),
    CONSTRAINT lista_precio_max_check CHECK (precio_max IS NULL OR precio_max >= 0),
    CONSTRAINT lista_rango_precio_check
        CHECK (precio_min IS NULL OR precio_max IS NULL OR precio_min <= precio_max)
);

-- 2.11 CLASIFICADO_EN (N:M libro - categoria)
CREATE TABLE public.clasificado_en (
    isbn              varchar(13) NOT NULL,
    nombre_categoria  varchar     NOT NULL,
    CONSTRAINT clasificado_en_pkey PRIMARY KEY (isbn, nombre_categoria),
    CONSTRAINT clasificado_en_libro_fkey FOREIGN KEY (isbn) REFERENCES public.libro_metadata_cache (isbn),
    CONSTRAINT clasificado_en_categoria_fkey FOREIGN KEY (nombre_categoria) REFERENCES public.categoria (nombre)
);

-- 2.12 PUBLICACION_HISTORIAL_PRECIO
CREATE TABLE public.publicacion_historial_precio (
    isbn                    varchar(13)    NOT NULL,
    propietario_id          uuid           NOT NULL,
    hora_de_publicacion     timestamp      NOT NULL,
    fecha_cambio            timestamp      NOT NULL DEFAULT now(),
    valor_puntos_anterior   bigint         NOT NULL,
    valor_puntos_nuevo      bigint         NOT NULL,
    color_anterior          color_semaforo,
    color_nuevo             color_semaforo,
    CONSTRAINT publicacion_historial_precio_pkey
        PRIMARY KEY (isbn, propietario_id, hora_de_publicacion, fecha_cambio),
    CONSTRAINT publicacion_historial_precio_publicacion_fkey
        FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion (isbn, propietario_id, hora_de_publicacion)
);

-- 2.13 NOTIFICACION (única PK artificial del esquema)
CREATE TABLE public.notificacion (
    id                   bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    usuario_id           uuid              NOT NULL,
    isbn                 varchar(13)       NOT NULL,
    propietario_id       uuid              NOT NULL,
    hora_de_publicacion  timestamp         NOT NULL,
    tipo                 tipo_notificacion NOT NULL,
    leida                boolean           NOT NULL DEFAULT false,
    archivada            boolean           NOT NULL DEFAULT false,
    fecha_creacion       timestamp         NOT NULL DEFAULT now(),
    CONSTRAINT notificacion_pkey PRIMARY KEY (id),
    CONSTRAINT notificacion_usuario_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario (id_usuario),
    CONSTRAINT notificacion_publicacion_fkey FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion (isbn, propietario_id, hora_de_publicacion)
);

-- 2.14 EVENTO_SISTEMA
CREATE TABLE public.evento_sistema (
    tipo_evento   tipo_evento_sistema NOT NULL,
    fecha_evento  timestamp           NOT NULL DEFAULT now(),
    descripcion   varchar,
    CONSTRAINT evento_sistema_pkey PRIMARY KEY (tipo_evento, fecha_evento)
);

-- 2.15 MOVIMIENTOS DE PUNTOS (cuatro orígenes disjuntos de CAMBIO_PUNTOS)
CREATE TABLE public.movimiento_puntos_compra (
    comprador_id         uuid           NOT NULL,
    isbn                 varchar(13)    NOT NULL,
    propietario_id       uuid           NOT NULL,
    hora_de_publicacion  timestamp      NOT NULL,
    id_usuario           uuid           NOT NULL,
    tipo                 tipo_movimiento NOT NULL,
    monto                bigint         NOT NULL,
    CONSTRAINT movimiento_puntos_compra_pkey
        PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion, id_usuario, tipo),
    CONSTRAINT movimiento_puntos_compra_compra_fkey
        FOREIGN KEY (comprador_id, isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.compra (comprador_id, isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT movimiento_puntos_compra_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario),
    CONSTRAINT movimiento_puntos_compra_monto_check CHECK (monto > 0),
    CONSTRAINT movimiento_puntos_compra_participante_check
        CHECK (id_usuario = comprador_id OR id_usuario = propietario_id)
);

CREATE TABLE public.movimiento_puntos_intercambio (
    isbn_solicitante                 varchar(13)    NOT NULL,
    propietario_id_solicitante       uuid           NOT NULL,
    hora_de_publicacion_solicitante  timestamp      NOT NULL,
    isbn_ofrecida                    varchar(13)    NOT NULL,
    propietario_id_ofrecida          uuid           NOT NULL,
    hora_de_publicacion_ofrecida     timestamp      NOT NULL,
    id_usuario                       uuid           NOT NULL,
    tipo                             tipo_movimiento NOT NULL,
    monto                            bigint         NOT NULL,
    CONSTRAINT movimiento_puntos_intercambio_pkey PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        id_usuario, tipo),
    CONSTRAINT movimiento_puntos_intercambio_intercambio_fkey
        FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                     isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES public.intercambio (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                                       isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    CONSTRAINT movimiento_puntos_intercambio_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario),
    CONSTRAINT movimiento_puntos_intercambio_monto_check CHECK (monto > 0),
    CONSTRAINT movimiento_puntos_intercambio_participante_check
        CHECK (id_usuario = propietario_id_solicitante OR id_usuario = propietario_id_ofrecida)
);

CREATE TABLE public.movimiento_puntos_resena (
    isbn_solicitante                 varchar(13)    NOT NULL,
    propietario_id_solicitante       uuid           NOT NULL,
    hora_de_publicacion_solicitante  timestamp      NOT NULL,
    isbn_ofrecida                    varchar(13)    NOT NULL,
    propietario_id_ofrecida          uuid           NOT NULL,
    hora_de_publicacion_ofrecida     timestamp      NOT NULL,
    solicitante_reviewer             boolean        NOT NULL,
    id_usuario                       uuid           NOT NULL,
    tipo                             tipo_movimiento NOT NULL,
    monto                            bigint         NOT NULL,
    CONSTRAINT movimiento_puntos_resena_pkey PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer, id_usuario, tipo),
    CONSTRAINT movimiento_puntos_resena_resena_fkey
        FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                     isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
                     solicitante_reviewer)
        REFERENCES public.resena (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                                  isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
                                  solicitante_reviewer),
    CONSTRAINT movimiento_puntos_resena_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario),
    CONSTRAINT movimiento_puntos_resena_monto_check CHECK (monto > 0),
    -- RN19: los puntos van a quien escribe la reseña (el reviewer)
    CONSTRAINT movimiento_puntos_resena_usuario_valido_check CHECK (
        id_usuario = CASE WHEN solicitante_reviewer
                          THEN propietario_id_solicitante
                          ELSE propietario_id_ofrecida END)
);

CREATE TABLE public.movimiento_puntos_sistema (
    tipo_evento   tipo_evento_sistema NOT NULL,
    fecha_evento  timestamp           NOT NULL,
    id_usuario    uuid                NOT NULL,
    tipo          tipo_movimiento     NOT NULL,
    monto         bigint              NOT NULL,
    CONSTRAINT movimiento_puntos_sistema_pkey PRIMARY KEY (tipo_evento, fecha_evento, id_usuario, tipo),
    CONSTRAINT movimiento_puntos_sistema_evento_fkey FOREIGN KEY (tipo_evento, fecha_evento)
        REFERENCES public.evento_sistema (tipo_evento, fecha_evento),
    CONSTRAINT movimiento_puntos_sistema_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario (id_usuario),
    CONSTRAINT movimiento_puntos_sistema_monto_check CHECK (monto > 0)
);

-- ============================================================
-- 3. FUNCIONES Y TRIGGERS
-- ============================================================

-- 3.1 Semáforo (umbrales +-10%: placeholder pendiente de definición de negocio)
CREATE FUNCTION public.fn_calcular_color_semaforo(
    p_valor_puntos numeric,
    p_valor_referencia numeric
) RETURNS color_semaforo
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF p_valor_referencia IS NULL OR p_valor_referencia = 0 OR p_valor_puntos IS NULL THEN
        RETURN 'SIN_REFERENCIA';
    END IF;
    IF p_valor_puntos <= p_valor_referencia * 0.90 THEN
        RETURN 'VERDE';
    ELSIF p_valor_puntos <= p_valor_referencia * 1.10 THEN
        RETURN 'AMARILLO';
    END IF;
    RETURN 'ROJO';
END;
$$;

CREATE FUNCTION public.fn_set_color_inicial() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.color_semaforo := public.fn_calcular_color_semaforo(
        NEW.valor_puntos_solicitado, NEW.valor_referencia_calculado);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_color_inicial
    BEFORE INSERT ON public.publicacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_color_inicial();

-- 3.2 Historial de precio (recalcula el color y registra el cambio)
-- clock_timestamp() y no now(): now() es constante dentro de la transacción y
-- dos UPDATE de la misma publicación en una transacción chocarían contra la PK.
CREATE FUNCTION public.fn_trackear_cambio_precio() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.color_semaforo := public.fn_calcular_color_semaforo(
        NEW.valor_puntos_solicitado, NEW.valor_referencia_calculado);

    IF NEW.valor_puntos_solicitado IS DISTINCT FROM OLD.valor_puntos_solicitado
       OR NEW.color_semaforo IS DISTINCT FROM OLD.color_semaforo
    THEN
        INSERT INTO public.publicacion_historial_precio (
            isbn, propietario_id, hora_de_publicacion, fecha_cambio,
            valor_puntos_anterior, valor_puntos_nuevo, color_anterior, color_nuevo)
        VALUES (
            OLD.isbn, OLD.propietario_id, OLD.hora_de_publicacion, clock_timestamp(),
            OLD.valor_puntos_solicitado, NEW.valor_puntos_solicitado,
            OLD.color_semaforo, NEW.color_semaforo);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trackear_cambio_precio
    BEFORE UPDATE ON public.publicacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_trackear_cambio_precio();

-- 3.3 Ciclos en categorías (el CHECK sólo bloquea la auto-referencia directa)
CREATE FUNCTION public.fn_evitar_ciclo_categoria() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.categoria_padre_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF EXISTS (
        WITH RECURSIVE ancestros AS (
            SELECT c.nombre, c.categoria_padre_id
            FROM public.categoria c
            WHERE c.nombre = NEW.categoria_padre_id
            UNION
            SELECT c.nombre, c.categoria_padre_id
            FROM public.categoria c
            JOIN ancestros a ON c.nombre = a.categoria_padre_id
        )
        SELECT 1 FROM ancestros WHERE nombre = NEW.nombre
    ) THEN
        RAISE EXCEPTION 'La categoría "%" no puede ser descendiente de sí misma', NEW.nombre;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evitar_ciclo_categoria
    BEFORE INSERT OR UPDATE ON public.categoria
    FOR EACH ROW EXECUTE FUNCTION public.fn_evitar_ciclo_categoria();

-- 3.4 Reseñas: usuario reseñado, validación y reputación
-- Devuelve el RESEÑADO: reviewer = solicitante -> reseñado = propietario de la ofrecida.
CREATE FUNCTION public.fn_resena_reviewed(
    p_propietario_id_solicitante uuid,
    p_propietario_id_ofrecida uuid,
    p_solicitante_reviewer boolean
) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN p_solicitante_reviewer THEN p_propietario_id_ofrecida
                ELSE p_propietario_id_solicitante END;
$$;

-- Sobrecarga sobre la fila (permite usarla como columna computada en PostgREST)
CREATE FUNCTION public.fn_resena_reviewed(p public.resena) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
    SELECT public.fn_resena_reviewed(
        p.propietario_id_solicitante, p.propietario_id_ofrecida, p.solicitante_reviewer);
$$;

CREATE FUNCTION public.fn_validar_resena() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_estado estado_intercambio;
BEGIN
    SELECT i.estado INTO v_estado
    FROM public.intercambio i
    WHERE i.isbn_solicitante = NEW.isbn_solicitante
      AND i.propietario_id_solicitante = NEW.propietario_id_solicitante
      AND i.hora_de_publicacion_solicitante = NEW.hora_de_publicacion_solicitante
      AND i.isbn_ofrecida = NEW.isbn_ofrecida
      AND i.propietario_id_ofrecida = NEW.propietario_id_ofrecida
      AND i.hora_de_publicacion_ofrecida = NEW.hora_de_publicacion_ofrecida;

    IF v_estado IS DISTINCT FROM 'COMPLETADO' THEN
        RAISE EXCEPTION 'No se puede crear una reseña para un intercambio no completado';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_resena
    BEFORE INSERT OR UPDATE ON public.resena
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_resena();

CREATE FUNCTION public.fn_recalcular_reputacion(p_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.usuario u
    SET reputacion_promedio = (
        SELECT AVG(r.calificacion)::numeric
        FROM public.resena r
        WHERE (r.solicitante_reviewer = true  AND r.propietario_id_ofrecida = p_id)
           OR (r.solicitante_reviewer = false AND r.propietario_id_solicitante = p_id)
    )
    WHERE u.id_usuario = p_id;
END;
$$;

CREATE FUNCTION public.fn_actualizar_reputacion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_new uuid;
    v_old uuid;
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new := public.fn_resena_reviewed(
            NEW.propietario_id_solicitante, NEW.propietario_id_ofrecida, NEW.solicitante_reviewer);
        PERFORM public.fn_recalcular_reputacion(v_new);
    END IF;

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old := public.fn_resena_reviewed(
            OLD.propietario_id_solicitante, OLD.propietario_id_ofrecida, OLD.solicitante_reviewer);
        IF TG_OP = 'DELETE' OR v_old IS DISTINCT FROM v_new THEN
            PERFORM public.fn_recalcular_reputacion(v_old);
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reputacion_resena
    AFTER INSERT OR UPDATE OR DELETE ON public.resena
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_reputacion();

-- 3.5 Aplicación de movimientos al saldo
--   INGRESO / DEVOLUCION : saldo_total    += monto
--   RESERVA              : saldo_reservado += monto
--   LIBERACION_RESERVA   : saldo_reservado -= monto
--   EGRESO               : saldo_total    -= monto
--                          y, si el origen es compra/intercambio, consume la reserva:
--                          saldo_reservado -= monto (flujo RESERVA -> EGRESO sin liberación intermedia).
--                          Un EGRESO de sistema (ajuste administrativo) no tiene reserva previa.
CREATE FUNCTION public.fn_aplicar_movimiento_puntos() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tipo IN ('INGRESO', 'DEVOLUCION') THEN
        UPDATE public.usuario
        SET saldo_total = saldo_total + NEW.monto
        WHERE id_usuario = NEW.id_usuario;

    ELSIF NEW.tipo = 'EGRESO' THEN
        IF TG_TABLE_NAME = 'movimiento_puntos_sistema' THEN
            UPDATE public.usuario
            SET saldo_total = saldo_total - NEW.monto
            WHERE id_usuario = NEW.id_usuario;
        ELSE
            UPDATE public.usuario
            SET saldo_total = saldo_total - NEW.monto,
                saldo_reservado = saldo_reservado - NEW.monto
            WHERE id_usuario = NEW.id_usuario;
        END IF;

    ELSIF NEW.tipo = 'RESERVA' THEN
        UPDATE public.usuario
        SET saldo_reservado = saldo_reservado + NEW.monto
        WHERE id_usuario = NEW.id_usuario;

    ELSIF NEW.tipo = 'LIBERACION_RESERVA' THEN
        UPDATE public.usuario
        SET saldo_reservado = saldo_reservado - NEW.monto
        WHERE id_usuario = NEW.id_usuario;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_movimiento_compra
    AFTER INSERT ON public.movimiento_puntos_compra
    FOR EACH ROW EXECUTE FUNCTION public.fn_aplicar_movimiento_puntos();
CREATE TRIGGER trg_aplicar_movimiento_intercambio
    AFTER INSERT ON public.movimiento_puntos_intercambio
    FOR EACH ROW EXECUTE FUNCTION public.fn_aplicar_movimiento_puntos();
CREATE TRIGGER trg_aplicar_movimiento_resena
    AFTER INSERT ON public.movimiento_puntos_resena
    FOR EACH ROW EXECUTE FUNCTION public.fn_aplicar_movimiento_puntos();
CREATE TRIGGER trg_aplicar_movimiento_sistema
    AFTER INSERT ON public.movimiento_puntos_sistema
    FOR EACH ROW EXECUTE FUNCTION public.fn_aplicar_movimiento_puntos();

-- 3.6 Alta inicial (RN03/RN04/RN15: 500 puntos, una vez por cuenta)
CREATE FUNCTION public.fn_puntos_alta_inicial() RETURNS bigint
LANGUAGE sql IMMUTABLE AS
$$ SELECT 500::bigint; $$;
;

-- clock_timestamp() + ON CONFLICT: dos altas en la misma transacción/instante
-- comparten el evento (la PK del movimiento incluye id_usuario, no colisiona).
CREATE FUNCTION public.fn_alta_inicial_automatica() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_fecha timestamp := clock_timestamp();
BEGIN
    INSERT INTO public.evento_sistema (tipo_evento, fecha_evento, descripcion)
    VALUES ('ALTA_INICIAL', v_fecha, 'Alta inicial automática')
    ON CONFLICT (tipo_evento, fecha_evento) DO NOTHING;

    INSERT INTO public.movimiento_puntos_sistema (tipo_evento, fecha_evento, id_usuario, tipo, monto)
    VALUES ('ALTA_INICIAL', v_fecha, NEW.id_usuario, 'INGRESO', public.fn_puntos_alta_inicial());

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alta_inicial_automatica
    AFTER INSERT ON public.usuario
    FOR EACH ROW EXECUTE FUNCTION public.fn_alta_inicial_automatica();

-- 3.7 Estado de las publicaciones según el intercambio
-- Sólo actúa en cambios de estado. Una publicación sólo se reserva si está DISPONIBLE,
-- sólo se libera si este intercambio la tenía reservada (OLD.estado = ACEPTADO) y
-- nunca resucita una publicación VENDIDA/ELIMINADA.
CREATE FUNCTION public.fn_intercambio_actualizar_publicaciones() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_filas integer;
BEGIN
    IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NEW.estado = 'ACEPTADO' THEN
        UPDATE public.publicacion
        SET estado = 'RESERVADA'
        WHERE estado = 'DISPONIBLE'
          AND (isbn, propietario_id, hora_de_publicacion) IN (
              (NEW.isbn_solicitante, NEW.propietario_id_solicitante, NEW.hora_de_publicacion_solicitante),
              (NEW.isbn_ofrecida,    NEW.propietario_id_ofrecida,    NEW.hora_de_publicacion_ofrecida));
        GET DIAGNOSTICS v_filas = ROW_COUNT;
        IF v_filas <> 2 THEN
            RAISE EXCEPTION 'Alguna de las publicaciones del intercambio no está disponible';
        END IF;

    ELSIF NEW.estado = 'COMPLETADO' THEN
        UPDATE public.publicacion
        SET estado = 'VENDIDA'
        WHERE estado IN ('DISPONIBLE', 'RESERVADA')
          AND (isbn, propietario_id, hora_de_publicacion) IN (
              (NEW.isbn_solicitante, NEW.propietario_id_solicitante, NEW.hora_de_publicacion_solicitante),
              (NEW.isbn_ofrecida,    NEW.propietario_id_ofrecida,    NEW.hora_de_publicacion_ofrecida));

    ELSIF NEW.estado IN ('RECHAZADO', 'CANCELADO') AND OLD.estado = 'ACEPTADO' THEN
        UPDATE public.publicacion
        SET estado = 'DISPONIBLE'
        WHERE estado = 'RESERVADA'
          AND (isbn, propietario_id, hora_de_publicacion) IN (
              (NEW.isbn_solicitante, NEW.propietario_id_solicitante, NEW.hora_de_publicacion_solicitante),
              (NEW.isbn_ofrecida,    NEW.propietario_id_ofrecida,    NEW.hora_de_publicacion_ofrecida));
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_intercambio_actualizar_publicaciones
    AFTER UPDATE ON public.intercambio
    FOR EACH ROW EXECUTE FUNCTION public.fn_intercambio_actualizar_publicaciones();

-- 3.8 Cadena: estados terminales irreversibles
CREATE FUNCTION public.fn_cadena_bloquear_reversion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.estado = 'COMPLETADA' AND NEW.estado <> 'COMPLETADA' THEN
        RAISE EXCEPTION 'Una cadena completada no puede revertirse';
    END IF;
    IF OLD.estado = 'CANCELADA' AND NEW.estado <> 'CANCELADA' THEN
        RAISE EXCEPTION 'Una cadena cancelada no puede reactivarse';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cadena_bloquear_reversion
    BEFORE UPDATE ON public.cadena
    FOR EACH ROW EXECUTE FUNCTION public.fn_cadena_bloquear_reversion();

-- 3.9 Sanciones: disjunción (un reporte, a lo sumo un subtipo)
CREATE FUNCTION public.fn_validar_sancion_disjunta() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF (TG_TABLE_NAME <> 'baneo' AND EXISTS (
            SELECT 1 FROM public.baneo b
            WHERE b.reportante_id = NEW.reportante_id AND b.hora_reporte = NEW.hora_reporte
              AND b.reportado_id = NEW.reportado_id))
    OR (TG_TABLE_NAME <> 'bajar_calificacion' AND EXISTS (
            SELECT 1 FROM public.bajar_calificacion b
            WHERE b.reportante_id = NEW.reportante_id AND b.hora_reporte = NEW.hora_reporte
              AND b.reportado_id = NEW.reportado_id))
    OR (TG_TABLE_NAME <> 'cartel_mal_intercambiador' AND EXISTS (
            SELECT 1 FROM public.cartel_mal_intercambiador b
            WHERE b.reportante_id = NEW.reportante_id AND b.hora_reporte = NEW.hora_reporte
              AND b.reportado_id = NEW.reportado_id))
    THEN
        RAISE EXCEPTION 'El reporte ya tiene otra sancion asociada';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_disjunta_baneo
    BEFORE INSERT ON public.baneo
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_sancion_disjunta();
CREATE TRIGGER trg_disjunta_bajar_calificacion
    BEFORE INSERT ON public.bajar_calificacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_sancion_disjunta();
CREATE TRIGGER trg_disjunta_cartel
    BEFORE INSERT ON public.cartel_mal_intercambiador
    FOR EACH ROW EXECUTE FUNCTION public.fn_validar_sancion_disjunta();

-- 3.10 Generación de sanciones: la regla de asignación no está definida en (1); stub.
CREATE FUNCTION public.fn_reporte_generar_sancion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reporte_generar_sancion
    AFTER UPDATE ON public.reporte
    FOR EACH ROW EXECUTE FUNCTION public.fn_reporte_generar_sancion();

-- 3.11 Notificaciones a seguidores (lista). Sólo publicaciones DISPONIBLES;
-- respeta precio_min/precio_max y condiciones_aceptables de la lista.
CREATE FUNCTION public.fn_publicacion_notificar_seguidores() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado <> 'DISPONIBLE' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notificacion (usuario_id, isbn, propietario_id, hora_de_publicacion, tipo)
        SELECT l.usuario_id, NEW.isbn, NEW.propietario_id, NEW.hora_de_publicacion, 'PUBLICACION_NUEVA'
        FROM public.lista l
        WHERE l.isbn = NEW.isbn
          AND l.usuario_id <> NEW.propietario_id
          AND (l.precio_min IS NULL OR NEW.valor_puntos_solicitado >= l.precio_min)
          AND (l.precio_max IS NULL OR NEW.valor_puntos_solicitado <= l.precio_max)
          AND (l.condiciones_aceptables IS NULL
               OR cardinality(l.condiciones_aceptables) = 0
               OR NEW.estado_fisico = ANY (l.condiciones_aceptables));

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.valor_puntos_solicitado < OLD.valor_puntos_solicitado THEN
            INSERT INTO public.notificacion (usuario_id, isbn, propietario_id, hora_de_publicacion, tipo)
            SELECT l.usuario_id, NEW.isbn, NEW.propietario_id, NEW.hora_de_publicacion, 'BAJA_PRECIO'
            FROM public.lista l
            WHERE l.isbn = NEW.isbn
              AND l.usuario_id <> NEW.propietario_id
              AND (l.precio_min IS NULL OR NEW.valor_puntos_solicitado >= l.precio_min)
              AND (l.precio_max IS NULL OR NEW.valor_puntos_solicitado <= l.precio_max)
              AND (l.condiciones_aceptables IS NULL
                   OR cardinality(l.condiciones_aceptables) = 0
                   OR NEW.estado_fisico = ANY (l.condiciones_aceptables));
        END IF;

        IF OLD.color_semaforo IS DISTINCT FROM 'VERDE' AND NEW.color_semaforo = 'VERDE' THEN
            INSERT INTO public.notificacion (usuario_id, isbn, propietario_id, hora_de_publicacion, tipo)
            SELECT l.usuario_id, NEW.isbn, NEW.propietario_id, NEW.hora_de_publicacion, 'CRUCE_VERDE'
            FROM public.lista l
            WHERE l.isbn = NEW.isbn
              AND l.usuario_id <> NEW.propietario_id
              AND (l.precio_min IS NULL OR NEW.valor_puntos_solicitado >= l.precio_min)
              AND (l.precio_max IS NULL OR NEW.valor_puntos_solicitado <= l.precio_max)
              AND (l.condiciones_aceptables IS NULL
                   OR cardinality(l.condiciones_aceptables) = 0
                   OR NEW.estado_fisico = ANY (l.condiciones_aceptables));
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_publicacion_notificar_nueva
    AFTER INSERT ON public.publicacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_publicacion_notificar_seguidores();
CREATE TRIGGER trg_publicacion_notificar_baja_precio
    AFTER UPDATE ON public.publicacion
    FOR EACH ROW EXECUTE FUNCTION public.fn_publicacion_notificar_seguidores();

-- 3.12 Integración con Supabase Auth: auth.users -> usuario.
-- No fija saldo: los 500 puntos los acredita trg_alta_inicial_automatica.
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.usuario (id_usuario, email, nombre_usuario, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nombre_usuario', ''), split_part(NEW.email, '@', 1)),
        'USUARIO');
    RETURN NEW;
END;
$$;

-- El trigger sobre auth.users sólo se crea si el esquema auth existe (Supabase).
DO $$
BEGIN
    IF to_regclass('auth.users') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;

-- ============================================================
-- 4. ÍNDICES
-- (no se crean los que duplican un prefijo de PK: publicacion(isbn), compra(comprador_id),
--  intercambio(solicitante), resena(intercambio), historial_precio(publicacion))
-- ============================================================
CREATE INDEX idx_categoria_padre            ON public.categoria (categoria_padre_id);
CREATE INDEX idx_clasificado_categoria      ON public.clasificado_en (nombre_categoria);
CREATE INDEX idx_publicacion_propietario    ON public.publicacion (propietario_id);
CREATE INDEX idx_compra_publicacion         ON public.compra (isbn, propietario_id, hora_de_publicacion);
CREATE INDEX idx_intercambio_ofrecida       ON public.intercambio (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida);
CREATE INDEX idx_lista_isbn                 ON public.lista (isbn);
CREATE INDEX idx_notificacion_usuario       ON public.notificacion (usuario_id);
CREATE INDEX idx_notificacion_no_leidas     ON public.notificacion (usuario_id) WHERE leida = false;
CREATE INDEX idx_notificacion_publicacion   ON public.notificacion (isbn, propietario_id, hora_de_publicacion);
CREATE INDEX idx_reporte_reportado          ON public.reporte (reportado_id);
CREATE INDEX idx_mov_compra_usuario         ON public.movimiento_puntos_compra (id_usuario);
CREATE INDEX idx_mov_intercambio_usuario    ON public.movimiento_puntos_intercambio (id_usuario);
CREATE INDEX idx_mov_resena_usuario         ON public.movimiento_puntos_resena (id_usuario);
CREATE INDEX idx_mov_sistema_usuario        ON public.movimiento_puntos_sistema (id_usuario);

COMMIT;
