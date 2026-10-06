-- =======================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS PARA MERCADOLIBRO
-- Compatible con PostgreSQL (Supabase) y H2
-- =======================================================


DO $$ BEGIN
    CREATE TYPE estado_intercambio AS ENUM
        ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento AS ENUM
        ('RESERVA', 'LIBERACION_RESERVA', 'INGRESO', 'EGRESO', 'BONIFICACION','DEVOLUCION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_notificacion AS ENUM
        ('INTERCAMBIO_SOLICITADO','INTERCAMBIO_ACEPTADO','INTERCAMBIO_COMPLETADO','RESENIA_RECIBIDA','PUNTOS_GANADOS','PUNTOS_GASTADOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =======================================================
-- USUARIO
-- =======================================================

CREATE TABLE IF NOT EXISTS usuario (
    id                  UUID PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    nombre              VARCHAR(255) NOT NULL UNIQUE,
    contrasenia         VARCHAR(255) NOT NULL,
    saldo_total         INTEGER DEFAULT 100,
    saldo_reservado     INTEGER DEFAULT 0,
    reputacion_promedio REAL NOT NULL DEFAULT 5.0,
    rol                 VARCHAR(50) DEFAULT 'USUARIO'
                        CHECK (rol IN ('USUARIO', 'ADMINISTRADOR')),
    es_activo           BOOLEAN NOT NULL DEFAULT TRUE
);


-- =======================================================
-- CATEGORIA Y LIBRO
-- =======================================================

CREATE TABLE IF NOT EXISTS categoria (
    nombre             VARCHAR(255) PRIMARY KEY,
    categoria_padre_id VARCHAR(255) REFERENCES categoria (nombre)
);

CREATE TABLE IF NOT EXISTS libro (
    isbn                      VARCHAR(255) PRIMARY KEY,
    google_books_id           VARCHAR(255) NOT NULL UNIQUE,
    titulo                    VARCHAR(255) NOT NULL,
    autores                   VARCHAR(255),
    puntuacion_externa        NUMERIC(3, 2) CHECK (puntuacion_externa BETWEEN 0 AND 5),
    valor_referencia          INTEGER,
    fecha_cache_bibliografico TIMESTAMP,
    fecha_cache_puntuacion    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS libro_categoria (
    isbn             VARCHAR(255) NOT NULL REFERENCES libro (isbn) ON DELETE CASCADE,
    nombre_categoria VARCHAR(255) NOT NULL REFERENCES categoria (nombre) ON DELETE CASCADE,
    PRIMARY KEY (isbn, nombre_categoria)
);

-- Usuario.librosSeguidos
CREATE TABLE IF NOT EXISTS seguimiento (
    email_usuario VARCHAR(255) NOT NULL REFERENCES usuario (email) ON DELETE CASCADE ON UPDATE CASCADE,
    isbn          VARCHAR(255) NOT NULL REFERENCES libro (isbn) ON DELETE CASCADE,
    PRIMARY KEY (email_usuario, isbn)
);


-- =======================================================
-- PUBLICACION
-- PK: (isbn, email_propietario, hora_publicacion)
-- =======================================================

CREATE TABLE IF NOT EXISTS publicacion (
    isbn                       VARCHAR(255) NOT NULL REFERENCES libro (isbn),
    email_propietario          VARCHAR(255) NOT NULL REFERENCES usuario (email) ON UPDATE CASCADE,
    hora_publicacion           TIMESTAMP    NOT NULL,
    estado_fisico              VARCHAR(50)
                               CHECK (estado_fisico IN ('NUEVO', 'COMO_NUEVO', 'BUEN_ESTADO', 'ACEPTABLE', 'DETERIORADO')),
    valor_puntos_solicitado    INTEGER,
    valor_referencia_calculado INTEGER,
    comentario                 VARCHAR(255),
    estado_publicacion         VARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE'
                               CHECK (estado_publicacion IN ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ELIMINADA')),
    color_semaforo             VARCHAR(50) NOT NULL DEFAULT 'SIN_REFERENCIA'
                               CHECK (color_semaforo IN ('VERDE', 'AMARILLO', 'ROJO', 'SIN_REFERENCIA')),
    PRIMARY KEY (isbn, email_propietario, hora_publicacion)
);


-- =======================================================
-- COMPRA
-- PK: (comprador_email, isbn, propietario_email, hora_publicacion)
-- =======================================================

CREATE TABLE IF NOT EXISTS compra (
    comprador_email    VARCHAR(255) NOT NULL REFERENCES usuario (email) ON UPDATE CASCADE,
    isbn               VARCHAR(255) NOT NULL,
    propietario_email  VARCHAR(255) NOT NULL,
    hora_publicacion   TIMESTAMP    NOT NULL,
    puntos             INTEGER      NOT NULL CHECK (puntos >= 0),
    timestamp          TIMESTAMPTZ  NOT NULL,
    estado             VARCHAR(50)  NOT NULL
                       CHECK (estado IN ('PENDIENTE_PAGO', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA')),
    info_envio         VARCHAR(255),
    motivo_cancelacion VARCHAR(255),
    PRIMARY KEY (comprador_email, isbn, propietario_email, hora_publicacion),
    FOREIGN KEY (isbn, propietario_email, hora_publicacion)
        REFERENCES publicacion (isbn, email_propietario, hora_publicacion)
);


-- =======================================================
-- CADENA DE INTERCAMBIO
-- =======================================================

CREATE TABLE IF NOT EXISTS cadena_intercambio (
    id           UUID PRIMARY KEY,
    puntos_bonus INTEGER DEFAULT 0,
    estado       VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS cadena_participantes (
    cadena_id  UUID NOT NULL REFERENCES cadena_intercambio (id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    PRIMARY KEY (cadena_id, usuario_id)
);


-- =======================================================
-- INTERCAMBIO
-- PK: publicación solicitada (3 cols) + publicación ofrecida (3 cols)
-- =======================================================

CREATE TABLE IF NOT EXISTS intercambio (
    isbn_solicitante                VARCHAR(255) NOT NULL,
    propietario_id_solicitante      VARCHAR(255) NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP    NOT NULL,
    isbn_ofrecida                   VARCHAR(255) NOT NULL,
    propietario_id_ofrecida         VARCHAR(255) NOT NULL,
    hora_de_publicacion_ofrecida    TIMESTAMP    NOT NULL,
    estado                          estado_intercambio NOT NULL DEFAULT 'PENDIENTE',
    puntos_comprometidos            INTEGER NOT NULL DEFAULT 0 CHECK (puntos_comprometidos >= 0),
    motivo_rechazo                  VARCHAR(255),
    cadena_id                       UUID REFERENCES cadena_intercambio (id),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        REFERENCES publicacion (isbn, email_propietario, hora_publicacion),
    FOREIGN KEY (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES publicacion (isbn, email_propietario, hora_publicacion)
);


-- =======================================================
-- RESEÑA
-- PK: intercambio (6 cols) + solicitante_reviewer
-- =======================================================

CREATE TABLE IF NOT EXISTS resenia (
    isbn_solicitante                VARCHAR(255) NOT NULL,
    propietario_id_solicitante      VARCHAR(255) NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP    NOT NULL,
    isbn_ofrecida                   VARCHAR(255) NOT NULL,
    propietario_id_ofrecida         VARCHAR(255) NOT NULL,
    hora_de_publicacion_ofrecida    TIMESTAMP    NOT NULL,
    solicitante_reviewer            BOOLEAN      NOT NULL,
    calificacion                    SMALLINT     NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario                      VARCHAR(255),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) REFERENCES intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) ON DELETE CASCADE
);


-- =======================================================
-- EVENTO SISTEMA
-- =======================================================

CREATE TABLE IF NOT EXISTS evento_sistema (
    tipo_evento_sistema VARCHAR(50) NOT NULL
                        CHECK (tipo_evento_sistema IN ('ALTA_INICIAL', 'PROMOCION', 'AJUSTE_ADMIN', 'OTRO')),
    fecha_evento        TIMESTAMP   NOT NULL,
    descripcion         VARCHAR(255),
    PRIMARY KEY (tipo_evento_sistema, fecha_evento)
);


-- =======================================================
-- MOVIMIENTOS DE PUNTOS - SISTEMA
-- (acá "tipo" es VARCHAR: MovimientoPuntosSistemaId no usa NAMED_ENUM)
-- =======================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_sistema (
    tipo_evento  VARCHAR(50) NOT NULL,
    fecha_evento TIMESTAMP   NOT NULL,
    id_usuario   UUID        NOT NULL REFERENCES usuario (id),
    tipo         VARCHAR(50) NOT NULL
                 CHECK (tipo IN ('INGRESO', 'EGRESO', 'RESERVA', 'LIBERACION_RESERVA', 'DEVOLUCION', 'BONIFICACION')),
    monto        BIGINT      NOT NULL CHECK (monto > 0),
    PRIMARY KEY (tipo_evento, fecha_evento, id_usuario, tipo),
    FOREIGN KEY (tipo_evento, fecha_evento)
        REFERENCES evento_sistema (tipo_evento_sistema, fecha_evento)
);


-- =======================================================
-- MOVIMIENTOS DE PUNTOS - COMPRA
-- =======================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_compra (
    comprador_id        VARCHAR(255)    NOT NULL,
    isbn                VARCHAR(255)    NOT NULL,
    propietario_id      VARCHAR(255)    NOT NULL,
    hora_de_publicacion TIMESTAMP       NOT NULL,
    id_usuario          UUID            NOT NULL REFERENCES usuario (id),
    tipo                tipo_movimiento NOT NULL,
    monto               BIGINT          NOT NULL CHECK (monto > 0),
    PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion, id_usuario, tipo),
    FOREIGN KEY (comprador_id, isbn, propietario_id, hora_de_publicacion)
        REFERENCES compra (comprador_email, isbn, propietario_email, hora_publicacion)
        ON DELETE CASCADE
);


-- =======================================================
-- MOVIMIENTOS DE PUNTOS - INTERCAMBIO
-- =======================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_intercambio (
    isbn_solicitante                VARCHAR(255)    NOT NULL,
    propietario_id_solicitante      VARCHAR(255)    NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP       NOT NULL,
    isbn_ofrecida                   VARCHAR(255)    NOT NULL,
    propietario_id_ofrecida         VARCHAR(255)    NOT NULL,
    hora_de_publicacion_ofrecida    TIMESTAMP       NOT NULL,
    id_usuario                      UUID            NOT NULL REFERENCES usuario (id),
    tipo                            tipo_movimiento NOT NULL,
    monto                           BIGINT          NOT NULL CHECK (monto > 0),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        id_usuario, tipo
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) REFERENCES intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) ON DELETE CASCADE
);


-- =======================================================
-- MOVIMIENTOS DE PUNTOS - RESEÑA
-- =======================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_resenia (
    isbn_solicitante                VARCHAR(255)    NOT NULL,
    propietario_id_solicitante      VARCHAR(255)    NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP       NOT NULL,
    isbn_ofrecida                   VARCHAR(255)    NOT NULL,
    propietario_id_ofrecida         VARCHAR(255)    NOT NULL,
    hora_de_publicacion_ofrecida    TIMESTAMP       NOT NULL,
    solicitante_reviewer            BOOLEAN         NOT NULL,
    id_usuario                      UUID            NOT NULL REFERENCES usuario (id),
    tipo                            tipo_movimiento NOT NULL,
    monto                           BIGINT          NOT NULL CHECK (monto > 0),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer, id_usuario, tipo
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer
    ) REFERENCES resenia (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer
    ) ON DELETE CASCADE
);


-- =======================================================
-- NOTIFICACION
-- =======================================================

CREATE TABLE IF NOT EXISTS notificacion (
    id                   UUID PRIMARY KEY,
    email_usuario        VARCHAR(255) NOT NULL REFERENCES usuario (email) ON DELETE CASCADE ON UPDATE CASCADE,
    isbn                 VARCHAR(255),
    email_propietario_id VARCHAR(255),
    hora_de_publicacion  TIMESTAMP,
    tipo                 tipo_notificacion NOT NULL,
    leida                BOOLEAN   NOT NULL DEFAULT FALSE,
    archivada            BOOLEAN   NOT NULL DEFAULT FALSE,
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT now(),
    FOREIGN KEY (isbn, email_propietario_id, hora_de_publicacion)
        REFERENCES publicacion (isbn, email_propietario, hora_publicacion)
        ON DELETE CASCADE
);


-- =======================================================
-- OFERTA DE INTERCAMBIO
-- =======================================================

CREATE TABLE IF NOT EXISTS oferta_intercambio (
    id                 UUID PRIMARY KEY,
    usuario_id         UUID         NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    libro_ofrecido_id  VARCHAR(255) NOT NULL REFERENCES libro (isbn) ON DELETE CASCADE,
    puntos_solicitados INTEGER,
    precio_min         INTEGER,
    precio_max         INTEGER
);

CREATE TABLE IF NOT EXISTS oferta_libros_deseados (
    oferta_id UUID         NOT NULL REFERENCES oferta_intercambio (id) ON DELETE CASCADE,
    libro_id  VARCHAR(255) NOT NULL REFERENCES libro (isbn) ON DELETE CASCADE,
    PRIMARY KEY (oferta_id, libro_id)
);