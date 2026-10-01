CREATE TYPE public.rol_usuario AS ENUM ('ADMINISTRADOR', 'USUARIO');
CREATE TYPE public.estado_cuenta AS ENUM ('ACTIVA', 'SUSPENDIDA', 'BANEADA');
CREATE TYPE public.calidad_libro AS ENUM ('NUEVO', 'COMO_NUEVO', 'BUENO', 'ACEPTABLE', 'MALO');
CREATE TYPE public.estado_intercambio AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO');
CREATE TYPE public.estado_compra AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'COMPLETADA');
CREATE TYPE public.tipo_movimiento AS ENUM ('INGRESO', 'EGRESO', 'RESERVA', 'LIBERACION_RESERVA', 'DEVOLUCION');
CREATE TYPE public.tipo_evento_sistema AS ENUM ('ALTA_INICIAL', 'PROMOCION', 'AJUSTE_ADMIN', 'OTRO');
CREATE TYPE public.calidad_resena AS ENUM ('POSITIVA', 'NEGATIVA');
CREATE TYPE public.entidad_reporte AS ENUM ('USUARIO', 'PUBLICACION', 'INTERCAMBIO');
CREATE TYPE public.motivo_reporte AS ENUM (
    'MAL_ESTADO_LIBRO',
    'INCUMPLIMIENTO_INTERCAMBIO',
    'FRAUDE',
    'COMPORTAMIENTO_INADECUADO',
    'OTRO'
);
CREATE TYPE public.estado_reporte AS ENUM ('PENDIENTE', 'EN_REVISION', 'RESUELTO', 'RECHAZADO');
CREATE TYPE public.estado_cadena AS ENUM ('ACTIVA', 'COMPLETADA', 'CANCELADA');
CREATE TYPE public.estado_publicacion AS ENUM ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ELIMINADA');
CREATE TYPE public.color_semaforo AS ENUM ('VERDE', 'AMARILLO', 'ROJO', 'SIN_REFERENCIA');
CREATE TYPE public.frecuencia_notificacion AS ENUM ('INSTANTANEA', 'DIARIA');
CREATE TYPE public.tipo_notificacion AS ENUM ('PUBLICACION_NUEVA', 'BAJA_PRECIO', 'CRUCE_VERDE', 'OTRO');

CREATE TABLE public.usuario (
    usuario_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email varchar NOT NULL UNIQUE,
    nombre_usuario varchar,
    rol public.rol_usuario NOT NULL DEFAULT 'USUARIO',
    saldo_total numeric NOT NULL DEFAULT 0 CHECK (saldo_total >= 0),
    saldo_reservado numeric NOT NULL DEFAULT 0 CHECK (saldo_reservado >= 0 AND saldo_reservado <= saldo_total),
    reputacion_promedio numeric CHECK (reputacion_promedio BETWEEN 1 AND 5),
    estado_cuenta public.estado_cuenta NOT NULL DEFAULT 'ACTIVA',
    notificacion_email boolean NOT NULL DEFAULT true,
    notificacion_inapp boolean NOT NULL DEFAULT true,
    frecuencia_notificacion public.frecuencia_notificacion NOT NULL DEFAULT 'INSTANTANEA',
    hora_resumen_diario time
);

CREATE TABLE public.categoria (
    nombre varchar PRIMARY KEY,
    categoria_padre_id varchar REFERENCES public.categoria(nombre),
    CONSTRAINT categoria_no_es_su_propio_padre CHECK (categoria_padre_id IS NULL OR categoria_padre_id <> nombre)
);

CREATE TABLE public.libro_metadata_cache (
    isbn varchar PRIMARY KEY,
    google_books_id varchar NOT NULL UNIQUE,
    titulo varchar NOT NULL,
    autores varchar,
    puntuacion_externa numeric CHECK (puntuacion_externa BETWEEN 0 AND 5),
    fecha_cache_bibliografico timestamp,
    fecha_cache_puntuacion timestamp
);

CREATE TABLE public.publicacion (
    isbn varchar NOT NULL REFERENCES public.libro_metadata_cache(isbn),
    email_propietario_id varchar NOT NULL REFERENCES public.usuario(email),
    hora_de_publicacion timestamp NOT NULL DEFAULT now(),
    estado_fisico public.calidad_libro NOT NULL,
    valor_puntos_solicitado bigint NOT NULL CHECK (valor_puntos_solicitado >= 0),
    valor_referencia_calculado bigint CHECK (valor_referencia_calculado IS NULL OR valor_referencia_calculado >= 0),
    comentario varchar,
    estado public.estado_publicacion NOT NULL DEFAULT 'DISPONIBLE',
    color_semaforo public.color_semaforo NOT NULL DEFAULT 'SIN_REFERENCIA',
    PRIMARY KEY (isbn, email_propietario_id, hora_de_publicacion)
);

CREATE TABLE public.compra (
    comprador_id varchar NOT NULL REFERENCES public.usuario(email),
    isbn varchar NOT NULL,
    propietario_id varchar NOT NULL,
    hora_de_publicacion timestamp NOT NULL,
    puntos bigint NOT NULL CHECK (puntos > 0),
    estado public.estado_compra NOT NULL DEFAULT 'PENDIENTE',
    PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion),
    FOREIGN KEY (isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion(isbn, email_propietario_id, hora_de_publicacion)
);

CREATE TABLE public.intercambio (
    isbn_solicitante varchar NOT NULL,
    propietario_id_solicitante varchar NOT NULL,
    hora_de_publicacion_solicitante timestamp NOT NULL,
    isbn_ofrecida varchar NOT NULL,
    propietario_id_ofrecida varchar NOT NULL,
    hora_de_publicacion_ofrecida timestamp NOT NULL,
    estado public.estado_intercambio NOT NULL DEFAULT 'PENDIENTE',
    puntos_comprometidos numeric NOT NULL DEFAULT 0 CHECK (puntos_comprometidos >= 0),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ),
    FOREIGN KEY (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        REFERENCES public.publicacion(isbn, email_propietario_id, hora_de_publicacion),
    FOREIGN KEY (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
        REFERENCES public.publicacion(isbn, email_propietario_id, hora_de_publicacion),
    CONSTRAINT intercambio_publicaciones_distintas CHECK (
        (isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante)
        <> (isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida)
    ),
    CONSTRAINT intercambio_propietarios_distintos CHECK (propietario_id_solicitante <> propietario_id_ofrecida)
);

CREATE TABLE public.evento_sistema (
    tipo_evento public.tipo_evento_sistema NOT NULL,
    fecha_evento timestamp NOT NULL DEFAULT now(),
    descripcion varchar,
    PRIMARY KEY (tipo_evento, fecha_evento)
);

CREATE TABLE public.movimiento_puntos_compra (
    comprador_id varchar NOT NULL,
    isbn varchar NOT NULL,
    propietario_id varchar NOT NULL,
    hora_de_publicacion timestamp NOT NULL,
    id_usuario uuid NOT NULL REFERENCES public.usuario(usuario_id),
    tipo public.tipo_movimiento NOT NULL,
    monto bigint NOT NULL CHECK (monto > 0),
    PRIMARY KEY (comprador_id, isbn, propietario_id, hora_de_publicacion, id_usuario, tipo),
    FOREIGN KEY (comprador_id, isbn, propietario_id, hora_de_publicacion)
        REFERENCES public.compra(comprador_id, isbn, propietario_id, hora_de_publicacion)
);

CREATE TABLE public.movimiento_puntos_intercambio (
    isbn_solicitante varchar NOT NULL,
    propietario_id_solicitante varchar NOT NULL,
    hora_de_publicacion_solicitante timestamp NOT NULL,
    isbn_ofrecida varchar NOT NULL,
    propietario_id_ofrecida varchar NOT NULL,
    hora_de_publicacion_ofrecida timestamp NOT NULL,
    id_usuario uuid NOT NULL REFERENCES public.usuario(usuario_id),
    tipo public.tipo_movimiento NOT NULL,
    monto bigint NOT NULL CHECK (monto > 0),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, id_usuario, tipo
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) REFERENCES public.intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    )
);

CREATE TABLE public.resena (
    isbn_solicitante varchar NOT NULL,
    propietario_id_solicitante varchar NOT NULL,
    hora_de_publicacion_solicitante timestamp NOT NULL,
    isbn_ofrecida varchar NOT NULL,
    propietario_id_ofrecida varchar NOT NULL,
    hora_de_publicacion_ofrecida timestamp NOT NULL,
    solicitante_reviewer boolean NOT NULL,
    calificacion smallint NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario varchar,
    calidad public.calidad_resena,
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, solicitante_reviewer
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ) REFERENCES public.intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    )
);

CREATE TABLE public.movimiento_puntos_resena (
    isbn_solicitante varchar NOT NULL,
    propietario_id_solicitante varchar NOT NULL,
    hora_de_publicacion_solicitante timestamp NOT NULL,
    isbn_ofrecida varchar NOT NULL,
    propietario_id_ofrecida varchar NOT NULL,
    hora_de_publicacion_ofrecida timestamp NOT NULL,
    solicitante_reviewer boolean NOT NULL,
    id_usuario uuid NOT NULL REFERENCES public.usuario(usuario_id),
    tipo public.tipo_movimiento NOT NULL,
    monto bigint NOT NULL CHECK (monto > 0),
    PRIMARY KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida,
        solicitante_reviewer, id_usuario, tipo
    ),
    FOREIGN KEY (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, solicitante_reviewer
    ) REFERENCES public.resena (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida, solicitante_reviewer
    )
);

CREATE TABLE public.movimiento_puntos_sistema (
    tipo_evento public.tipo_evento_sistema NOT NULL,
    fecha_evento timestamp NOT NULL,
    id_usuario uuid NOT NULL REFERENCES public.usuario(usuario_id),
    tipo public.tipo_movimiento NOT NULL,
    monto bigint NOT NULL CHECK (monto > 0),
    PRIMARY KEY (tipo_evento, fecha_evento, id_usuario, tipo),
    FOREIGN KEY (tipo_evento, fecha_evento)
        REFERENCES public.evento_sistema(tipo_evento, fecha_evento)
);

CREATE TABLE public.cadena (
    isbn_solicitante_anterior varchar NOT NULL,
    propietario_id_solicitante_anterior varchar NOT NULL,
    hora_de_publicacion_solicitante_anterior timestamp NOT NULL,
    isbn_ofrecida_anterior varchar NOT NULL,
    propietario_id_ofrecida_anterior varchar NOT NULL,
    hora_de_publicacion_ofrecida_anterior timestamp NOT NULL,
    isbn_solicitante_siguiente varchar NOT NULL,
    propietario_id_solicitante_siguiente varchar NOT NULL,
    hora_de_publicacion_solicitante_siguiente timestamp NOT NULL,
    isbn_ofrecida_siguiente varchar NOT NULL,
    propietario_id_ofrecida_siguiente varchar NOT NULL,
    hora_de_publicacion_ofrecida_siguiente timestamp NOT NULL,
    estado public.estado_cadena NOT NULL DEFAULT 'ACTIVA',
    PRIMARY KEY (
        isbn_solicitante_anterior, propietario_id_solicitante_anterior, hora_de_publicacion_solicitante_anterior,
        isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior,
        isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente,
        isbn_ofrecida_siguiente, propietario_id_ofrecida_siguiente, hora_de_publicacion_ofrecida_siguiente
    ),
    FOREIGN KEY (
        isbn_solicitante_anterior, propietario_id_solicitante_anterior, hora_de_publicacion_solicitante_anterior,
        isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior
    ) REFERENCES public.intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ),
    FOREIGN KEY (
        isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente,
        isbn_ofrecida_siguiente, propietario_id_ofrecida_siguiente, hora_de_publicacion_ofrecida_siguiente
    ) REFERENCES public.intercambio (
        isbn_solicitante, propietario_id_solicitante, hora_de_publicacion_solicitante,
        isbn_ofrecida, propietario_id_ofrecida, hora_de_publicacion_ofrecida
    ),
    CONSTRAINT cadena_publicaciones_continuas CHECK (
        (isbn_ofrecida_anterior, propietario_id_ofrecida_anterior, hora_de_publicacion_ofrecida_anterior)
        = (isbn_solicitante_siguiente, propietario_id_solicitante_siguiente, hora_de_publicacion_solicitante_siguiente)
    )
);

CREATE TABLE public.reporte (
    email_reportante_id varchar NOT NULL REFERENCES public.usuario(email),
    hora_reporte timestamp NOT NULL DEFAULT now(),
    email_reportado_id varchar NOT NULL REFERENCES public.usuario(email),
    entidad_tipo public.entidad_reporte NOT NULL,
    motivo public.motivo_reporte NOT NULL,
    estado public.estado_reporte NOT NULL DEFAULT 'PENDIENTE',
    PRIMARY KEY (email_reportante_id, hora_reporte, email_reportado_id),
    CONSTRAINT reporte_no_autorreferente CHECK (email_reportante_id <> email_reportado_id)
);

CREATE TABLE public.baneo (
    email_reportante_id varchar NOT NULL,
    hora_reporte timestamp NOT NULL,
    email_reportado_id varchar NOT NULL,
    fecha_inicio timestamp NOT NULL DEFAULT now(),
    fecha_fin timestamp,
    PRIMARY KEY (email_reportante_id, hora_reporte, email_reportado_id),
    FOREIGN KEY (email_reportante_id, hora_reporte, email_reportado_id)
        REFERENCES public.reporte(email_reportante_id, hora_reporte, email_reportado_id)
);

CREATE TABLE public.bajar_calificacion (
    email_reportante_id varchar NOT NULL,
    hora_reporte timestamp NOT NULL,
    email_reportado_id varchar NOT NULL,
    castigo smallint,
    PRIMARY KEY (email_reportante_id, hora_reporte, email_reportado_id),
    FOREIGN KEY (email_reportante_id, hora_reporte, email_reportado_id)
        REFERENCES public.reporte(email_reportante_id, hora_reporte, email_reportado_id)
);

CREATE TABLE public.cartel_mal_intercambiador (
    email_reportante_id varchar NOT NULL,
    hora_reporte timestamp NOT NULL,
    email_reportado_id varchar NOT NULL,
    cartel boolean NOT NULL DEFAULT true,
    PRIMARY KEY (email_reportante_id, hora_reporte, email_reportado_id),
    FOREIGN KEY (email_reportante_id, hora_reporte, email_reportado_id)
        REFERENCES public.reporte(email_reportante_id, hora_reporte, email_reportado_id)
);

CREATE TABLE public.lista (
    email_usuario varchar NOT NULL REFERENCES public.usuario(email),
    isbn varchar NOT NULL REFERENCES public.libro_metadata_cache(isbn),
    nota_privada varchar,
    precio_min integer,
    precio_max integer,
    condiciones_aceptables public.calidad_libro[],
    fecha_agregado timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (email_usuario, isbn),
    CONSTRAINT lista_rango_precio_valido CHECK (precio_min IS NULL OR precio_max IS NULL OR precio_min <= precio_max)
);

CREATE TABLE public.clasificado_en (
    isbn varchar NOT NULL REFERENCES public.libro_metadata_cache(isbn),
    nombre_categoria varchar NOT NULL REFERENCES public.categoria(nombre),
    PRIMARY KEY (isbn, nombre_categoria)
);

CREATE TABLE public.publicacion_historial_precio (
    isbn varchar NOT NULL,
    email_propietario_id varchar NOT NULL,
    hora_de_publicacion timestamp NOT NULL,
    fecha_cambio timestamp NOT NULL DEFAULT now(),
    valor_puntos_anterior integer NOT NULL,
    valor_puntos_nuevo integer NOT NULL,
    color_anterior public.color_semaforo,
    color_nuevo public.color_semaforo,
    PRIMARY KEY (isbn, email_propietario_id, hora_de_publicacion, fecha_cambio),
    FOREIGN KEY (isbn, email_propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion(isbn, email_propietario_id, hora_de_publicacion)
);

CREATE TABLE public.notificacion (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email_usuario varchar NOT NULL REFERENCES public.usuario(email),
    isbn varchar NOT NULL,
    email_propietario_id varchar NOT NULL,
    hora_de_publicacion timestamp NOT NULL,
    tipo public.tipo_notificacion NOT NULL,
    leida boolean NOT NULL DEFAULT false,
    archivada boolean NOT NULL DEFAULT false,
    fecha_creacion timestamp NOT NULL DEFAULT now(),
    FOREIGN KEY (isbn, email_propietario_id, hora_de_publicacion)
        REFERENCES public.publicacion(isbn, email_propietario_id, hora_de_publicacion)
);

CREATE VIEW public.movimiento_puntos
WITH (security_invoker = true)
AS
SELECT id_usuario, tipo, monto, 'COMPRA'::text AS origen
FROM public.movimiento_puntos_compra
UNION ALL
SELECT id_usuario, tipo, monto, 'INTERCAMBIO'::text AS origen
FROM public.movimiento_puntos_intercambio
UNION ALL
SELECT id_usuario, tipo, monto, 'RESENA'::text AS origen
FROM public.movimiento_puntos_resena
UNION ALL
SELECT id_usuario, tipo, monto, 'SISTEMA'::text AS origen
FROM public.movimiento_puntos_sistema;

CREATE FUNCTION public.fn_puntos_alta_inicial()
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 100::numeric
$$;

CREATE FUNCTION public.fn_alta_inicial_automatica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    puntos numeric := public.fn_puntos_alta_inicial();
    v_fecha_evento timestamp;
BEGIN
    INSERT INTO public.evento_sistema (tipo_evento, descripcion)
    VALUES ('ALTA_INICIAL', 'Puntos iniciales por registro')
    RETURNING fecha_evento INTO v_fecha_evento;

    INSERT INTO public.movimiento_puntos_sistema (tipo_evento, fecha_evento, id_usuario, tipo, monto)
    VALUES ('ALTA_INICIAL', v_fecha_evento, NEW.usuario_id, 'INGRESO', puntos::bigint);

    UPDATE public.usuario SET saldo_total = saldo_total + puntos WHERE usuario_id = NEW.usuario_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alta_inicial_automatica
AFTER INSERT ON public.usuario
FOR EACH ROW EXECUTE FUNCTION public.fn_alta_inicial_automatica();

CREATE FUNCTION public.fn_crear_usuario_desde_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.usuario (usuario_id, email, nombre_usuario)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (usuario_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_crear_usuario_desde_auth();

CREATE FUNCTION public.fn_validar_usuario_movimiento_compra()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.compra c
        JOIN public.usuario u ON u.usuario_id = NEW.id_usuario
        WHERE c.comprador_id = NEW.comprador_id
          AND c.isbn = NEW.isbn
          AND c.propietario_id = NEW.propietario_id
          AND c.hora_de_publicacion = NEW.hora_de_publicacion
          AND u.email IN (c.comprador_id, c.propietario_id)
    ) THEN
        RAISE EXCEPTION 'El usuario del movimiento no participa en la compra';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_usuario_movimiento_compra
BEFORE INSERT OR UPDATE ON public.movimiento_puntos_compra
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_usuario_movimiento_compra();

CREATE FUNCTION public.fn_validar_usuario_movimiento_intercambio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.intercambio i
        JOIN public.usuario u ON u.usuario_id = NEW.id_usuario
        WHERE i.isbn_solicitante = NEW.isbn_solicitante
          AND i.propietario_id_solicitante = NEW.propietario_id_solicitante
          AND i.hora_de_publicacion_solicitante = NEW.hora_de_publicacion_solicitante
          AND i.isbn_ofrecida = NEW.isbn_ofrecida
          AND i.propietario_id_ofrecida = NEW.propietario_id_ofrecida
          AND i.hora_de_publicacion_ofrecida = NEW.hora_de_publicacion_ofrecida
          AND u.email IN (i.propietario_id_solicitante, i.propietario_id_ofrecida)
    ) THEN
        RAISE EXCEPTION 'El usuario del movimiento no participa en el intercambio';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_usuario_movimiento_intercambio
BEFORE INSERT OR UPDATE ON public.movimiento_puntos_intercambio
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_usuario_movimiento_intercambio();

CREATE FUNCTION public.fn_validar_sancion_disjunta()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_TABLE_NAME <> 'baneo' AND EXISTS (
        SELECT 1 FROM public.baneo
        WHERE email_reportante_id = NEW.email_reportante_id
          AND hora_reporte = NEW.hora_reporte
          AND email_reportado_id = NEW.email_reportado_id
    ) THEN
        RAISE EXCEPTION 'Un reporte no puede tener más de un tipo de sanción';
    END IF;
    IF TG_TABLE_NAME <> 'bajar_calificacion' AND EXISTS (
        SELECT 1 FROM public.bajar_calificacion
        WHERE email_reportante_id = NEW.email_reportante_id
          AND hora_reporte = NEW.hora_reporte
          AND email_reportado_id = NEW.email_reportado_id
    ) THEN
        RAISE EXCEPTION 'Un reporte no puede tener más de un tipo de sanción';
    END IF;
    IF TG_TABLE_NAME <> 'cartel_mal_intercambiador' AND EXISTS (
        SELECT 1 FROM public.cartel_mal_intercambiador
        WHERE email_reportante_id = NEW.email_reportante_id
          AND hora_reporte = NEW.hora_reporte
          AND email_reportado_id = NEW.email_reportado_id
    ) THEN
        RAISE EXCEPTION 'Un reporte no puede tener más de un tipo de sanción';
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

CREATE FUNCTION public.fn_validar_resena()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.intercambio i
        WHERE i.isbn_solicitante = NEW.isbn_solicitante
          AND i.propietario_id_solicitante = NEW.propietario_id_solicitante
          AND i.hora_de_publicacion_solicitante = NEW.hora_de_publicacion_solicitante
          AND i.isbn_ofrecida = NEW.isbn_ofrecida
          AND i.propietario_id_ofrecida = NEW.propietario_id_ofrecida
          AND i.hora_de_publicacion_ofrecida = NEW.hora_de_publicacion_ofrecida
          AND i.estado = 'COMPLETADO'
    ) THEN
        RAISE EXCEPTION 'Solo se pueden reseñar intercambios completados';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_resena
BEFORE INSERT OR UPDATE ON public.resena
FOR EACH ROW EXECUTE FUNCTION public.fn_validar_resena();

CREATE FUNCTION public.fn_resena_reviewed(
    p_propietario_solicitante varchar,
    p_propietario_ofrecida varchar,
    p_solicitante_reviewer boolean
)
RETURNS varchar
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE WHEN p_solicitante_reviewer
        THEN p_propietario_ofrecida
        ELSE p_propietario_solicitante
    END
$$;

CREATE FUNCTION public.fn_recalcular_reputacion_resena()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email varchar;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        v_email := public.fn_resena_reviewed(OLD.propietario_id_solicitante, OLD.propietario_id_ofrecida, OLD.solicitante_reviewer);
        UPDATE public.usuario u
        SET reputacion_promedio = (
            SELECT AVG(r.calificacion)::numeric
            FROM public.resena r
            WHERE public.fn_resena_reviewed(r.propietario_id_solicitante, r.propietario_id_ofrecida, r.solicitante_reviewer) = v_email
        )
        WHERE u.email = v_email;
    END IF;

    IF TG_OP <> 'DELETE' THEN
        v_email := public.fn_resena_reviewed(NEW.propietario_id_solicitante, NEW.propietario_id_ofrecida, NEW.solicitante_reviewer);
        UPDATE public.usuario u
        SET reputacion_promedio = (
            SELECT AVG(r.calificacion)::numeric
            FROM public.resena r
            WHERE public.fn_resena_reviewed(r.propietario_id_solicitante, r.propietario_id_ofrecida, r.solicitante_reviewer) = v_email
        )
        WHERE u.email = v_email;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reputacion_resena
AFTER INSERT OR UPDATE OR DELETE ON public.resena
FOR EACH ROW EXECUTE FUNCTION public.fn_recalcular_reputacion_resena();

CREATE FUNCTION public.fn_calcular_color_semaforo(
    p_valor bigint,
    p_referencia bigint
)
RETURNS public.color_semaforo
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_referencia IS NULL OR p_referencia <= 0 THEN
        RETURN 'SIN_REFERENCIA'::public.color_semaforo;
    ELSIF p_valor <= p_referencia * 0.9 THEN
        RETURN 'VERDE'::public.color_semaforo;
    ELSIF p_valor >= p_referencia * 1.1 THEN
        RETURN 'ROJO'::public.color_semaforo;
    ELSE
        RETURN 'AMARILLO'::public.color_semaforo;
    END IF;
END;
$$;

CREATE FUNCTION public.fn_set_color_inicial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.color_semaforo := public.fn_calcular_color_semaforo(
        NEW.valor_puntos_solicitado,
        NEW.valor_referencia_calculado
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_color_inicial
BEFORE INSERT ON public.publicacion
FOR EACH ROW EXECUTE FUNCTION public.fn_set_color_inicial();

CREATE FUNCTION public.fn_trackear_cambio_precio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.valor_puntos_solicitado IS DISTINCT FROM OLD.valor_puntos_solicitado
       OR NEW.valor_referencia_calculado IS DISTINCT FROM OLD.valor_referencia_calculado THEN
        NEW.color_semaforo := public.fn_calcular_color_semaforo(
            NEW.valor_puntos_solicitado,
            NEW.valor_referencia_calculado
        );
        INSERT INTO public.publicacion_historial_precio (
            isbn, email_propietario_id, hora_de_publicacion, valor_puntos_anterior,
            valor_puntos_nuevo, color_anterior, color_nuevo
        )
        VALUES (
            OLD.isbn, OLD.email_propietario_id, OLD.hora_de_publicacion,
            OLD.valor_puntos_solicitado::integer, NEW.valor_puntos_solicitado::integer,
            OLD.color_semaforo, NEW.color_semaforo
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trackear_cambio_precio
BEFORE UPDATE ON public.publicacion
FOR EACH ROW EXECUTE FUNCTION public.fn_trackear_cambio_precio();

CREATE FUNCTION public.fn_evitar_ciclo_categoria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.categoria_padre_id IS NULL THEN
        RETURN NEW;
    END IF;
    IF NEW.categoria_padre_id = NEW.nombre THEN
        RAISE EXCEPTION 'Una categoría no puede ser su propia categoría padre';
    END IF;

    IF EXISTS (
        WITH RECURSIVE ancestros(nombre, categoria_padre_id) AS (
            SELECT c.nombre, c.categoria_padre_id
            FROM public.categoria c
            WHERE c.nombre = NEW.categoria_padre_id
            UNION ALL
            SELECT c.nombre, c.categoria_padre_id
            FROM public.categoria c
            JOIN ancestros a ON c.nombre = a.categoria_padre_id
            WHERE a.categoria_padre_id IS NOT NULL
        )
        SELECT 1 FROM ancestros WHERE nombre = NEW.nombre
    ) THEN
        RAISE EXCEPTION 'La jerarquía de categorías no puede contener ciclos';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evitar_ciclo_categoria
BEFORE INSERT OR UPDATE OF categoria_padre_id ON public.categoria
FOR EACH ROW EXECUTE FUNCTION public.fn_evitar_ciclo_categoria();

ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intercambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_puntos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_puntos_intercambio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_puntos_resena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_puntos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resena ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baneo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bajar_calificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartel_mal_intercambiador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificado_en ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacion_historial_precio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_lectura_propia
ON public.usuario FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.jwt() ->> 'email'));

CREATE POLICY categoria_lectura_publica
ON public.categoria FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY metadata_libro_lectura_publica
ON public.libro_metadata_cache FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY publicacion_lectura_publica
ON public.publicacion FOR SELECT
TO anon, authenticated
USING (
    estado IN ('DISPONIBLE', 'RESERVADA')
    OR lower(email_propietario_id) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY publicacion_insercion_propia
ON public.publicacion FOR INSERT
TO authenticated
WITH CHECK (
    estado = 'DISPONIBLE'
    AND lower(email_propietario_id) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY publicacion_actualizacion_disponible_propia
ON public.publicacion FOR UPDATE
TO authenticated
USING (
    estado = 'DISPONIBLE'
    AND lower(email_propietario_id) = lower(auth.jwt() ->> 'email')
)
WITH CHECK (
    estado IN ('DISPONIBLE', 'ELIMINADA')
    AND lower(email_propietario_id) = lower(auth.jwt() ->> 'email')
);

CREATE POLICY movimiento_compra_lectura_propia
ON public.movimiento_puntos_compra FOR SELECT
TO authenticated
USING (id_usuario = auth.uid());

CREATE POLICY movimiento_intercambio_lectura_propia
ON public.movimiento_puntos_intercambio FOR SELECT
TO authenticated
USING (id_usuario = auth.uid());

CREATE POLICY movimiento_resena_lectura_propia
ON public.movimiento_puntos_resena FOR SELECT
TO authenticated
USING (id_usuario = auth.uid());

CREATE POLICY movimiento_sistema_lectura_propia
ON public.movimiento_puntos_sistema FOR SELECT
TO authenticated
USING (id_usuario = auth.uid());
