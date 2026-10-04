-- =======================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS PARA MERCADOLIBRO
-- Compatible con PostgreSQL (Supabase) y H2
-- =======================================================

-- TABLA: usuario
CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY,
    nombre VARCHAR(255) UNIQUE,
    contrasenia VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    saldo_total INTEGER DEFAULT 100,
    saldo_reservado INTEGER DEFAULT 0,
    reputacion_promedio REAL DEFAULT 5.0,
    rol VARCHAR(50) DEFAULT 'USUARIO',
    es_activo BOOLEAN DEFAULT TRUE
);

-- Asegurar columnas en caso de que la tabla ya existiera previamente
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS contrasenia VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS saldo_total INTEGER DEFAULT 100;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS saldo_reservado INTEGER DEFAULT 0;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS reputacion_promedio REAL DEFAULT 5.0;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'USUARIO';
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS es_activo BOOLEAN DEFAULT TRUE;

-- TABLA: libro
CREATE TABLE IF NOT EXISTS libro (
    isbn VARCHAR(255) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255) NOT NULL,
    estado_fisico VARCHAR(50) NOT NULL,
    valor_referencia INTEGER NOT NULL,
    disponible BOOLEAN NOT NULL,
    propietario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE
);

-- TABLA: libro_categoria
CREATE TABLE IF NOT EXISTS libro_categoria (
    libro_id UUID NOT NULL REFERENCES libro(id) ON DELETE CASCADE,
    categoria VARCHAR(50) NOT NULL
);

-- TABLA: cadena_intercambio
CREATE TABLE IF NOT EXISTS cadena_intercambio (
    id UUID PRIMARY KEY,
    puntos_bonus INTEGER DEFAULT 0,
    estado VARCHAR(50)
);

-- TABLA: cadena_participantes
CREATE TABLE IF NOT EXISTS cadena_participantes (
    cadena_id UUID NOT NULL REFERENCES cadena_intercambio(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    PRIMARY KEY (cadena_id, usuario_id)
);

-- TABLA: intercambio
CREATE TABLE IF NOT EXISTS intercambio (
    id UUID PRIMARY KEY,
    puntos_comprometidos INTEGER,
    tipo VARCHAR(50),
    estado VARCHAR(50),
    libro_deseado_id UUID NOT NULL REFERENCES libro(id),
    libro_ofrecido_id UUID REFERENCES libro(id),
    prestador_id UUID NOT NULL REFERENCES usuario(id),
    receptor_id UUID NOT NULL REFERENCES usuario(id),
    cadena_id UUID REFERENCES cadena_intercambio(id)
);

-- TABLA: movimiento_puntos
CREATE TABLE IF NOT EXISTS movimiento_puntos (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    intercambio_id UUID NOT NULL REFERENCES intercambio(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL
);

-- TABLA: resenia
CREATE TABLE IF NOT EXISTS resenia (
    id UUID PRIMARY KEY,
    intercambio_id UUID NOT NULL REFERENCES intercambio(id),
    autor UUID NOT NULL REFERENCES usuario(id),
    calificado UUID NOT NULL REFERENCES usuario(id),
    calificacion REAL NOT NULL,
    comentario VARCHAR(500),
    fecha DATE DEFAULT CURRENT_DATE
);

-- TABLA: notificacion
CREATE TABLE IF NOT EXISTS notificacion (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    intercambio_id UUID REFERENCES intercambio(id),
    resenia_id UUID REFERENCES resenia(id),
    movimiento_puntos_id UUID REFERENCES movimiento_puntos(id),
    tipo VARCHAR(50) NOT NULL,
    canal VARCHAR(50) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    mensaje VARCHAR(1000) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
);

-- TABLA: oferta_intercambio
CREATE TABLE IF NOT EXISTS oferta_intercambio (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    libro_ofrecido_id UUID NOT NULL REFERENCES libro(id) ON DELETE CASCADE,
    puntos_solicitados INTEGER,
    precio_min INTEGER,
    precio_max INTEGER
);

-- TABLA: oferta_libros_deseados
CREATE TABLE IF NOT EXISTS oferta_libros_deseados (
    oferta_id UUID NOT NULL REFERENCES oferta_intercambio(id) ON DELETE CASCADE,
    libro_id UUID NOT NULL REFERENCES libro(id) ON DELETE CASCADE,
    PRIMARY KEY (oferta_id, libro_id)
);


-- =======================================================
-- P3 - EVENTO SISTEMA
-- =======================================================

CREATE TABLE IF NOT EXISTS evento_sistema (
    tipo_evento_sistema VARCHAR(50) NOT NULL,
    fecha_evento TIMESTAMP NOT NULL,
    descripcion VARCHAR(255),

    PRIMARY KEY (
        tipo_evento_sistema,
        fecha_evento
    )
);

-- =======================================================
-- P3 - MOVIMIENTO PUNTOS SISTEMA
-- =======================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_sistema (
    tipo_evento VARCHAR(50) NOT NULL,
    fecha_evento TIMESTAMP NOT NULL,
    id_usuario UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),

    PRIMARY KEY (
        tipo_evento,
        fecha_evento,
        id_usuario,
        tipo
    ),

    CONSTRAINT fk_movimiento_evento
        FOREIGN KEY (tipo_evento, fecha_evento)
        REFERENCES evento_sistema (
            tipo_evento_sistema,
            fecha_evento
        ),

    CONSTRAINT fk_movimiento_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id)
);

-- =====================================================
-- MOVIMIENTOS DE PUNTOS - COMPRA
-- =====================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_compra (
    comprador_id VARCHAR(255) NOT NULL,
    isbn VARCHAR(255) NOT NULL,
    propietario_id VARCHAR(255) NOT NULL,
    hora_de_publicacion TIMESTAMP NOT NULL,
    id_usuario UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),

    PRIMARY KEY (
        comprador_id,
        isbn,
        propietario_id,
        hora_de_publicacion,
        id_usuario,
        tipo
    )
);


-- =====================================================
-- MOVIMIENTOS DE PUNTOS - INTERCAMBIO
-- =====================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_intercambio (
    isbn_solicitante VARCHAR(255) NOT NULL,
    propietario_id_solicitante VARCHAR(255) NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,

    isbn_ofrecida VARCHAR(255) NOT NULL,
    propietario_id_ofrecida VARCHAR(255) NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,

    id_usuario UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),

    PRIMARY KEY (
        isbn_solicitante,
        propietario_id_solicitante,
        hora_de_publicacion_solicitante,
        isbn_ofrecida,
        propietario_id_ofrecida,
        hora_de_publicacion_ofrecida,
        id_usuario,
        tipo
    )
);


-- =====================================================
-- MOVIMIENTOS DE PUNTOS - RESEÑA
-- =====================================================

CREATE TABLE IF NOT EXISTS movimiento_puntos_resenia (
    isbn_solicitante VARCHAR(255) NOT NULL,
    propietario_id_solicitante VARCHAR(255) NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,

    isbn_ofrecida VARCHAR(255) NOT NULL,
    propietario_id_ofrecida VARCHAR(255) NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,

    solicitante_reviewer BOOLEAN NOT NULL,

    id_usuario UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),

    PRIMARY KEY (
        isbn_solicitante,
        propietario_id_solicitante,
        hora_de_publicacion_solicitante,
        isbn_ofrecida,
        propietario_id_ofrecida,
        hora_de_publicacion_ofrecida,
        solicitante_reviewer,
        id_usuario,
        tipo
    )
);