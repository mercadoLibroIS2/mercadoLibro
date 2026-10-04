BEGIN;

DROP TABLE IF EXISTS movimiento_puntos_sistema, movimiento_puntos_resena,
    movimiento_puntos_compra, evento_sistema, notificacion,
    publicacion_historial_precio, lista, cartel_mal_intercambiador,
    bajar_calificacion, baneo, reporte, resena, cadena,
    movimiento_puntos_intercambio, intercambio, compra, publicacion,
    categoria, libro_metadata_cache, clasificado_en, usuario CASCADE;

DROP TYPE IF EXISTS estado_compra, tipo_evento_sistema, frecuencia_notificacion,
    tipo_notificacion, color_semaforo, estado_publicacion, estado_cadena,
    estado_reporte, motivo_reporte, entidad_reporte, calidad_resena,
    tipo_movimiento, estado_intercambio, calidad_libro, estado_cuenta,
    rol_usuario CASCADE;

CREATE TYPE rol_usuario AS ENUM ('ADMINISTRADOR', 'USUARIO');
CREATE TYPE estado_cuenta AS ENUM ('ACTIVA', 'SUSPENDIDA', 'BANEADA');
CREATE TYPE calidad_libro AS ENUM ('NUEVO', 'COMO_NUEVO', 'BUENO', 'ACEPTABLE', 'MALO');
CREATE TYPE estado_intercambio AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO');
CREATE TYPE tipo_movimiento AS ENUM ('INGRESO', 'EGRESO', 'RESERVA', 'LIBERACION_RESERVA', 'DEVOLUCION');
CREATE TYPE calidad_resena AS ENUM ('POSITIVA', 'NEGATIVA');
CREATE TYPE entidad_reporte AS ENUM ('USUARIO', 'PUBLICACION', 'INTERCAMBIO');
CREATE TYPE motivo_reporte AS ENUM ('MAL_ESTADO_LIBRO', 'INCUMPLIMIENTO_INTERCAMBIO', 'FRAUDE', 'COMPORTAMIENTO_INADECUADO', 'OTRO');
CREATE TYPE estado_reporte AS ENUM ('PENDIENTE', 'EN_REVISION', 'RESUELTO', 'RECHAZADO');
CREATE TYPE estado_cadena AS ENUM ('ACTIVA', 'COMPLETADA', 'CANCELADA');
CREATE TYPE estado_publicacion AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ELIMINADA');
CREATE TYPE color_semaforo AS ENUM ('VERDE', 'AMARILLO', 'ROJO', 'SIN_REFERENCIA');
CREATE TYPE tipo_notificacion AS ENUM ('PUBLICACION_NUEVA', 'BAJA_PRECIO', 'CRUCE_VERDE', 'OTRO');
CREATE TYPE frecuencia_notificacion AS ENUM ('INSTANTANEA', 'DIARIA');
CREATE TYPE tipo_evento_sistema AS ENUM ('ALTA_INICIAL', 'PROMOCION', 'AJUSTE_ADMIN', 'OTRO');
CREATE TYPE estado_compra AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA');

CREATE TABLE usuario (
    email VARCHAR NOT NULL UNIQUE,
    id_usuario UUID PRIMARY KEY,
    nombre_usuario VARCHAR NOT NULL,
    rol rol_usuario NOT NULL,
    saldo_total NUMERIC NOT NULL DEFAULT 0 CHECK (saldo_total >= 0),
    saldo_reservado NUMERIC NOT NULL DEFAULT 0 CHECK (saldo_reservado >= 0 AND saldo_reservado <= saldo_total),
    reputacion_promedio NUMERIC CHECK (reputacion_promedio IS NULL OR reputacion_promedio BETWEEN 1 AND 5),
    estado_cuenta estado_cuenta NOT NULL DEFAULT 'ACTIVA',
    notificacion_email BOOLEAN NOT NULL DEFAULT TRUE,
    notificacion_inapp BOOLEAN NOT NULL DEFAULT TRUE,
    frecuencia_notificacion frecuencia_notificacion NOT NULL DEFAULT 'INSTANTANEA',
    hora_resumen_diario TIME
);

CREATE TABLE libro_metadata_cache (
    isbn VARCHAR PRIMARY KEY,
    google_books_id VARCHAR NOT NULL UNIQUE,
    titulo VARCHAR NOT NULL,
    autores VARCHAR,
    puntuacion_externa NUMERIC CHECK (puntuacion_externa IS NULL OR puntuacion_externa BETWEEN 0 AND 5),
    fecha_cache_bibliografico TIMESTAMP,
    fecha_cache_puntuacion TIMESTAMP
);

CREATE TABLE categoria (
    nombre VARCHAR PRIMARY KEY,
    categoria_padre_id VARCHAR REFERENCES categoria(nombre),
    CONSTRAINT categoria_no_autopadre_check CHECK (categoria_padre_id IS NULL OR categoria_padre_id <> nombre)
);

CREATE TABLE publicacion (
    isbn VARCHAR NOT NULL REFERENCES libro_metadata_cache(isbn),
    propietario_id UUID NOT NULL REFERENCES usuario(id_usuario),
    hora_de_publicacion TIMESTAMP NOT NULL,
    estado_fisico calidad_libro NOT NULL,
    valor_puntos_solicitado BIGINT NOT NULL CHECK (valor_puntos_solicitado >= 0),
    valor_referencia_calculado BIGINT CHECK (valor_referencia_calculado IS NULL OR valor_referencia_calculado >= 0),
    comentario VARCHAR,
    estado estado_publicacion NOT NULL DEFAULT 'DISPONIBLE',
    color_semaforo color_semaforo NOT NULL DEFAULT 'SIN_REFERENCIA',
    PRIMARY KEY (isbn, propietario_id, hora_de_publicacion)
);

CREATE TABLE compra (
    comprador_id UUID NOT NULL REFERENCES usuario(id_usuario),
    isbn VARCHAR NOT NULL,
    propietario_id UUID NOT NULL,
    hora_de_publicacion TIMESTAMP NOT NULL,
    puntos BIGINT NOT NULL CHECK (puntos > 0),
    estado estado_compra NOT NULL DEFAULT 'PENDIENTE',
    PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion),
    FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES publicacion(isbn, propietario_id, hora_de_publicacion)
);

CREATE TABLE intercambio (
    isbn_solicitante VARCHAR NOT NULL,
    propietario_id_solicitante UUID NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,
    isbn_ofrecida VARCHAR NOT NULL,
    propietario_id_ofrecida UUID NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,
    estado estado_intercambio NOT NULL,
    puntos_comprometidos NUMERIC NOT NULL DEFAULT 0 CHECK (puntos_comprometidos >= 0),
    PRIMARY KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        REFERENCES publicacion(isbn, propietario_id, hora_de_publicacion),
    FOREIGN KEY (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES publicacion(isbn, propietario_id, hora_de_publicacion),
    CONSTRAINT intercambio_propietarios_distintos_check
        CHECK (propietario_id_solicitante <> propietario_id_ofrecida),
    CONSTRAINT intercambio_publicaciones_distintas_check CHECK (
        (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        IS DISTINCT FROM
        (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
    )
);

CREATE TABLE movimiento_puntos_intercambio (
    isbn_solicitante VARCHAR NOT NULL,
    propietario_id_solicitante UUID NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,
    isbn_ofrecida VARCHAR NOT NULL,
    propietario_id_ofrecida UUID NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,
    id_usuario UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo tipo_movimiento NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),
    PRIMARY KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, id_usuario, tipo),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES intercambio(isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                               isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
);

CREATE TABLE cadena (
    isbn_solicitante_anterior VARCHAR NOT NULL,
    propietario_id_solicitante_anterior UUID NOT NULL,
    hora_de_publicacion_solicitante_anterior TIMESTAMP NOT NULL,
    isbn_ofrecida_anterior VARCHAR NOT NULL,
    propietario_id_ofrecida_anterior UUID NOT NULL,
    hora_de_publicacion_ofrecida_anterior TIMESTAMP NOT NULL,
    isbn_solicitante_siguiente VARCHAR NOT NULL,
    propietario_id_solicitante_siguiente UUID NOT NULL,
    hora_de_publicacion_solicitante_siguiente TIMESTAMP NOT NULL,
    isbn_ofrecida_siguiente VARCHAR NOT NULL,
    propietario_id_ofrecida_siguiente UUID NOT NULL,
    hora_de_publicacion_ofrecida_siguiente TIMESTAMP NOT NULL,
    estado estado_cadena NOT NULL DEFAULT 'ACTIVA',
    PRIMARY KEY (isbn_solicitante_anterior, propietario_id_solicitante_anterior, hora_de_publicacion_solicitante_anterior,
                 isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior,
                 isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente,
                 isbn_ofrecida_siguiente, propietario_id_ofrecida_siguiente, hora_de_publicacion_ofrecida_siguiente),
    CONSTRAINT cadena_continuidad_check CHECK (
        isbn_ofrecida_anterior = isbn_solicitante_siguiente
        AND propietario_id_ofrecida_anterior = propietario_id_solicitante_siguiente
        AND hora_de_publicacion_ofrecida_anterior = hora_de_publicacion_solicitante_siguiente
    )
);

CREATE TABLE resena (
    isbn_solicitante VARCHAR NOT NULL,
    propietario_id_solicitante UUID NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,
    isbn_ofrecida VARCHAR NOT NULL,
    propietario_id_ofrecida UUID NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,
    calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario VARCHAR,
    calidad calidad_resena,
    solicitante_reviewer BOOLEAN NOT NULL,
    PRIMARY KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, solicitante_reviewer),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES intercambio(isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                               isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
);

CREATE TABLE reporte (
    usuario_reportante_id UUID NOT NULL REFERENCES usuario(id_usuario),
    hora_reporte TIMESTAMP NOT NULL,
    usuario_reportado_id UUID NOT NULL REFERENCES usuario(id_usuario),
    entidad_tipo entidad_reporte NOT NULL,
    motivo motivo_reporte NOT NULL,
    estado estado_reporte NOT NULL DEFAULT 'PENDIENTE',
    PRIMARY KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id),
    CHECK (usuario_reportante_id <> usuario_reportado_id)
);

CREATE TABLE baneo (
    usuario_reportante_id UUID NOT NULL,
    hora_reporte TIMESTAMP NOT NULL,
    usuario_reportado_id UUID NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL DEFAULT now(),
    fecha_fin TIMESTAMP,
    PRIMARY KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id),
    FOREIGN KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id)
        REFERENCES reporte(usuario_reportante_id, hora_reporte, usuario_reportado_id)
);

CREATE TABLE bajar_calificacion (
    usuario_reportante_id UUID NOT NULL,
    hora_reporte TIMESTAMP NOT NULL,
    usuario_reportado_id UUID NOT NULL,
    castigo SMALLINT,
    PRIMARY KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id),
    FOREIGN KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id)
        REFERENCES reporte(usuario_reportante_id, hora_reporte, usuario_reportado_id)
);

CREATE TABLE cartel_mal_intercambiador (
    usuario_reportante_id UUID NOT NULL,
    hora_reporte TIMESTAMP NOT NULL,
    usuario_reportado_id UUID NOT NULL,
    cartel BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id),
    FOREIGN KEY (usuario_reportante_id, hora_reporte, usuario_reportado_id)
        REFERENCES reporte(usuario_reportante_id, hora_reporte, usuario_reportado_id)
);

CREATE TABLE lista (
    usuario_id UUID NOT NULL REFERENCES usuario(id_usuario),
    isbn VARCHAR NOT NULL REFERENCES libro_metadata_cache(isbn),
    nota_privada VARCHAR,
    precio_min BIGINT CHECK (precio_min IS NULL OR precio_min >= 0),
    precio_max BIGINT CHECK (precio_max IS NULL OR precio_max >= 0),
    condiciones_aceptables calidad_libro[],
    fecha_agregado TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, isbn),
    CHECK (precio_min IS NULL OR precio_max IS NULL OR precio_min <= precio_max)
);

CREATE TABLE clasificado_en (
    isbn VARCHAR NOT NULL REFERENCES libro_metadata_cache(isbn),
    nombre_categoria VARCHAR NOT NULL REFERENCES categoria(nombre),
    PRIMARY KEY (isbn, nombre_categoria)
);

CREATE TABLE publicacion_historial_precio (
    isbn VARCHAR NOT NULL,
    propietario_id UUID NOT NULL,
    hora_de_publicacion TIMESTAMP NOT NULL,
    fecha_cambio TIMESTAMP NOT NULL DEFAULT now(),
    valor_puntos_anterior BIGINT NOT NULL,
    valor_puntos_nuevo BIGINT NOT NULL,
    color_anterior color_semaforo,
    color_nuevo color_semaforo,
    PRIMARY KEY (isbn, propietario_id, hora_de_publicacion, fecha_cambio),
    FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES publicacion(isbn, propietario_id, hora_de_publicacion)
);

CREATE TABLE notificacion (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuario(id_usuario),
    isbn VARCHAR NOT NULL,
    propietario_id UUID NOT NULL,
    hora_de_publicacion TIMESTAMP NOT NULL,
    tipo tipo_notificacion NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    archivada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES publicacion(isbn, propietario_id, hora_de_publicacion)
);

CREATE TABLE evento_sistema (
    tipo_evento tipo_evento_sistema NOT NULL,
    fecha_evento TIMESTAMP NOT NULL DEFAULT now(),
    descripcion VARCHAR,
    PRIMARY KEY (tipo_evento, fecha_evento)
);

CREATE TABLE movimiento_puntos_compra (
    comprador_id UUID NOT NULL,
    isbn VARCHAR NOT NULL,
    propietario_id UUID NOT NULL,
    hora_de_publicacion TIMESTAMP NOT NULL,
    id_usuario UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo tipo_movimiento NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),
    PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion, id_usuario, tipo),
    FOREIGN KEY (comprador_id, isbn, propietario_id, hora_de_publicacion)
        REFERENCES compra(comprador_id, isbn, propietario_id, hora_de_publicacion),
    CHECK (id_usuario = comprador_id OR id_usuario = propietario_id)
);

CREATE TABLE movimiento_puntos_resena (
    isbn_solicitante VARCHAR NOT NULL,
    propietario_id_solicitante UUID NOT NULL,
    hora_de_publicacion_solicitante TIMESTAMP NOT NULL,
    isbn_ofrecida VARCHAR NOT NULL,
    propietario_id_ofrecida UUID NOT NULL,
    hora_de_publicacion_ofrecida TIMESTAMP NOT NULL,
    solicitante_reviewer BOOLEAN NOT NULL,
    id_usuario UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo tipo_movimiento NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),
    PRIMARY KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
                 solicitante_reviewer, id_usuario, tipo),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                 isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
                 solicitante_reviewer)
        REFERENCES resena(isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
                          isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
                          solicitante_reviewer)
);

CREATE TABLE movimiento_puntos_sistema (
    tipo_evento tipo_evento_sistema NOT NULL,
    fecha_evento TIMESTAMP NOT NULL,
    id_usuario UUID NOT NULL REFERENCES usuario(id_usuario),
    tipo tipo_movimiento NOT NULL,
    monto BIGINT NOT NULL CHECK (monto > 0),
    PRIMARY KEY (tipo_evento, fecha_evento, id_usuario, tipo),
    FOREIGN KEY (tipo_evento, fecha_evento)
        REFERENCES evento_sistema(tipo_evento, fecha_evento)
);

CREATE INDEX idx_publicacion_propietario ON publicacion(propietario_id);
CREATE INDEX idx_publicacion_isbn ON publicacion(isbn);
CREATE INDEX idx_compra_comprador ON compra(comprador_id);
CREATE INDEX idx_compra_publicacion ON compra(isbn, propietario_id, hora_de_publicacion);
CREATE INDEX idx_intercambio_solicitante ON intercambio(isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante);
CREATE INDEX idx_intercambio_ofrecida ON intercambio(isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida);
CREATE INDEX idx_lista_isbn ON lista(isbn);
CREATE INDEX idx_notificacion_usuario ON notificacion(usuario_id);
CREATE INDEX idx_reporte_reportado ON reporte(usuario_reportado_id);

COMMIT;
