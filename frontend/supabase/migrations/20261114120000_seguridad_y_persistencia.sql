-- ==============================================================================
-- MercadoLibro: seguridad + persistencia de reseñas, movimientos de puntos,
-- notificaciones, seguimiento de libros y perfil.
--
-- Ejecutar UNA VEZ en el SQL Editor de Supabase, después de lib/supabase-schema.sql.
-- Es idempotente: se puede volver a correr sin romper nada.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Columnas nuevas en usuario (perfil editable y contadores públicos)
-- ------------------------------------------------------------------------------
alter table public.usuario add column if not exists nombre_completo text;
alter table public.usuario add column if not exists bio text;
alter table public.usuario add column if not exists ciudad text;
alter table public.usuario add column if not exists avatar_url text;
alter table public.usuario add column if not exists total_intercambios integer not null default 0;
alter table public.usuario add column if not exists total_resenias integer not null default 0;
alter table public.usuario add column if not exists fecha_alta timestamptz not null default now();

-- ------------------------------------------------------------------------------
-- 1. SEGURIDAD
-- ------------------------------------------------------------------------------

-- 1a. RLS en todas las tablas públicas (las tablas del backend Spring quedaban abiertas).
--     El backend Spring se conecta como postgres y no se ve afectado.
do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- 1b. usuario: no exponer el hash de contraseña, no permitir lectura anónima
--     y no permitir que un usuario se cambie el saldo o la reputación.
revoke all on public.usuario from anon;
revoke select, insert, update, delete on public.usuario from authenticated;
grant select (
  id, email, nombre, saldo_total, saldo_reservado, reputacion_promedio, rol, es_activo,
  nombre_completo, bio, ciudad, avatar_url, total_intercambios, total_resenias, fecha_alta
) on public.usuario to authenticated;
grant update (nombre_completo, bio, ciudad, avatar_url) on public.usuario to authenticated;

drop policy if exists "Permitir lectura publica de usuarios" on public.usuario;
drop policy if exists "Lectura de usuarios autenticados" on public.usuario;
create policy "Lectura de usuarios autenticados"
  on public.usuario for select to authenticated
  using (true);

drop policy if exists "Permitir al usuario editar su registro" on public.usuario;
create policy "Permitir al usuario editar su registro"
  on public.usuario for update to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email))
  with check (lower(auth.jwt() ->> 'email') = lower(email));

-- El alta la hace el trigger handle_new_user (security definer).
drop policy if exists "Permitir insercion de usuario propio" on public.usuario;

-- 1c. libro: solo se pueden tocar los metadatos bibliográficos.
revoke update, delete on public.libro from anon, authenticated;
grant update (google_books_id, titulo, autores, puntuacion_externa) on public.libro to authenticated;
drop policy if exists "Actualizar metadatos de libro" on public.libro;
create policy "Actualizar metadatos de libro"
  on public.libro for update to authenticated
  using (true) with check (true);

-- 1d. publicacion: el dueño no puede saltear el flujo de intercambio
--     (p. ej. pasar una publicación RESERVADA a DISPONIBLE o marcarla VENDIDA).
create or replace function public.proteger_publicacion()
returns trigger
language plpgsql
as $$
begin
  -- Las funciones security definer (intercambios) corren como postgres y no se restringen.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_publicacion := 'DISPONIBLE';
    return new;
  end if;

  if (new.isbn, new.email_propietario, new.hora_publicacion)
     is distinct from (old.isbn, old.email_propietario, old.hora_publicacion) then
    raise exception 'No se puede cambiar la identidad de una publicación.';
  end if;
  if old.estado_publicacion::text <> 'DISPONIBLE' then
    raise exception 'Solo se pueden modificar publicaciones disponibles (sin intercambio en curso).';
  end if;
  if new.estado_publicacion::text not in ('DISPONIBLE', 'ELIMINADA') then
    raise exception 'Estado de publicación no permitido.';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_publicacion on public.publicacion;
create trigger proteger_publicacion
  before insert or update on public.publicacion
  for each row execute function public.proteger_publicacion();

-- 1e. solicitud_intercambio: solo se escribe a través de las funciones.
revoke insert, update, delete on public.solicitud_intercambio from anon, authenticated;
drop policy if exists "Actualizar solicitudes propias" on public.solicitud_intercambio;
drop policy if exists "Crear solicitudes propias" on public.solicitud_intercambio;

-- ------------------------------------------------------------------------------
-- 2. TABLAS NUEVAS
-- ------------------------------------------------------------------------------

-- 2a. Historial de movimientos de puntos
create table if not exists public.movimiento_puntos_app (
  id bigint generated always as identity primary key,
  email_usuario varchar(255) not null references public.usuario(email) on update cascade on delete cascade,
  tipo text not null check (tipo in (
    'INICIAL', 'RESERVA', 'LIBERACION', 'TRANSFERENCIA_ENVIADA',
    'TRANSFERENCIA_RECIBIDA', 'BONO_INTERCAMBIO', 'RECOMPENSA_RESENIA'
  )),
  monto integer not null,
  saldo_resultante integer,
  descripcion text not null,
  solicitud_id uuid references public.solicitud_intercambio(id) on delete set null,
  fecha timestamptz not null default now()
);
create index if not exists movimiento_puntos_app_email_idx on public.movimiento_puntos_app (lower(email_usuario), fecha desc);
alter table public.movimiento_puntos_app enable row level security;
revoke all on public.movimiento_puntos_app from anon, authenticated;
grant select on public.movimiento_puntos_app to authenticated;
drop policy if exists "Ver movimientos propios" on public.movimiento_puntos_app;
create policy "Ver movimientos propios"
  on public.movimiento_puntos_app for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_usuario));

-- 2b. Notificaciones
create table if not exists public.notificacion_app (
  id uuid primary key default gen_random_uuid(),
  email_usuario varchar(255) not null references public.usuario(email) on update cascade on delete cascade,
  tipo text not null check (tipo in (
    'TRADE_REQUEST', 'TRADE_ACCEPTED', 'TRADE_REJECTED', 'TRADE_COMPLETED',
    'TRACKER_MATCH', 'CHAIN_DETECTED', 'POINTS_RECEIVED', 'REVIEW_RECEIVED'
  )),
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false,
  archivada boolean not null default false,
  pantalla text,
  solicitud_id uuid references public.solicitud_intercambio(id) on delete set null,
  isbn varchar(255),
  fecha timestamptz not null default now()
);
create index if not exists notificacion_app_email_idx on public.notificacion_app (lower(email_usuario), fecha desc);
alter table public.notificacion_app enable row level security;
revoke all on public.notificacion_app from anon, authenticated;
grant select on public.notificacion_app to authenticated;
grant update (leida, archivada) on public.notificacion_app to authenticated;
drop policy if exists "Ver notificaciones propias" on public.notificacion_app;
create policy "Ver notificaciones propias"
  on public.notificacion_app for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_usuario));
drop policy if exists "Marcar notificaciones propias" on public.notificacion_app;
create policy "Marcar notificaciones propias"
  on public.notificacion_app for update to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_usuario))
  with check (lower(auth.jwt() ->> 'email') = lower(email_usuario));

-- 2c. Reseñas de intercambios
create table if not exists public.resenia_intercambio (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitud_intercambio(id) on delete cascade,
  email_autor varchar(255) not null references public.usuario(email) on update cascade on delete cascade,
  email_destinatario varchar(255) not null references public.usuario(email) on update cascade on delete cascade,
  calificacion smallint not null check (calificacion between 1 and 5),
  comentario varchar(500),
  titulo_libro text,
  fecha timestamptz not null default now(),
  unique (solicitud_id, email_autor)
);
alter table public.resenia_intercambio enable row level security;
revoke all on public.resenia_intercambio from anon, authenticated;
grant select on public.resenia_intercambio to authenticated;
drop policy if exists "Reseñas visibles" on public.resenia_intercambio;
create policy "Reseñas visibles"
  on public.resenia_intercambio for select to authenticated
  using (true);

-- 2d. Seguimiento de libros (tracker)
create table if not exists public.seguimiento_libro (
  id uuid primary key default gen_random_uuid(),
  email_usuario varchar(255) not null default lower(auth.jwt() ->> 'email')
    references public.usuario(email) on update cascade on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  autor text,
  categoria text,
  max_puntos integer check (max_puntos is null or max_puntos > 0),
  estados_aceptables text[],
  notas text,
  fecha timestamptz not null default now()
);
alter table public.seguimiento_libro enable row level security;
revoke all on public.seguimiento_libro from anon, authenticated;
grant select, insert, delete on public.seguimiento_libro to authenticated;
drop policy if exists "Ver seguimientos propios" on public.seguimiento_libro;
create policy "Ver seguimientos propios"
  on public.seguimiento_libro for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_usuario));
drop policy if exists "Crear seguimientos propios" on public.seguimiento_libro;
create policy "Crear seguimientos propios"
  on public.seguimiento_libro for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = lower(email_usuario));
drop policy if exists "Borrar seguimientos propios" on public.seguimiento_libro;
create policy "Borrar seguimientos propios"
  on public.seguimiento_libro for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_usuario));

-- ------------------------------------------------------------------------------
-- 3. FUNCIONES INTERNAS (no se exponen por la API)
-- ------------------------------------------------------------------------------
create or replace function public._nombre_usuario(p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(nombre_completo), ''), nombre, split_part(p_email, '@', 1))
    from public.usuario
   where lower(email) = lower(p_email)
$$;

create or replace function public._titulo_libro(p_isbn text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select titulo from public.libro where isbn = p_isbn), 'ISBN ' || p_isbn)
$$;

create or replace function public._registrar_movimiento(
  p_email text, p_tipo text, p_monto integer, p_descripcion text, p_solicitud uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.movimiento_puntos_app (email_usuario, tipo, monto, saldo_resultante, descripcion, solicitud_id)
  select email, p_tipo, p_monto, saldo_total, p_descripcion, p_solicitud
    from public.usuario
   where lower(email) = lower(p_email);
end;
$$;

create or replace function public._notificar(
  p_email text, p_tipo text, p_titulo text, p_mensaje text,
  p_pantalla text, p_solicitud uuid, p_isbn text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificacion_app (email_usuario, tipo, titulo, mensaje, pantalla, solicitud_id, isbn)
  select email, p_tipo, p_titulo, p_mensaje, p_pantalla, p_solicitud, p_isbn
    from public.usuario
   where lower(email) = lower(p_email);
end;
$$;

revoke all on function public._nombre_usuario(text) from public, anon, authenticated;
revoke all on function public._titulo_libro(text) from public, anon, authenticated;
revoke all on function public._registrar_movimiento(text, text, integer, text, uuid) from public, anon, authenticated;
revoke all on function public._notificar(text, text, text, text, text, uuid, text) from public, anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. INTERCAMBIOS: misma lógica que antes + movimientos + notificaciones.
--    Cambio de regla: el intercambio por puntos se completa cuando confirman
--    las DOS partes (antes alcanzaba con el solicitante).
-- ------------------------------------------------------------------------------
create or replace function public.crear_solicitud_intercambio(p_solicitud jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := (p_solicitud ->> 'id')::uuid;
  v_tipo text := p_solicitud ->> 'tipo';
  v_isbn text := p_solicitud ->> 'isbn_solicitada';
  v_email_propietario text := p_solicitud ->> 'email_propietario_solicitada';
  v_hora timestamp := (p_solicitud ->> 'hora_publicacion_solicitada')::timestamp;
  v_isbn_ofrecida text := p_solicitud ->> 'isbn_ofrecida';
  v_email_ofrecida text := p_solicitud ->> 'email_propietario_ofrecida';
  v_hora_ofrecida timestamp := (p_solicitud ->> 'hora_publicacion_ofrecida')::timestamp;
  v_email_solicitante text := lower(auth.jwt() ->> 'email');
  v_puntos integer;
  v_titulo text;
begin
  if v_email_solicitante is null
    or v_email_solicitante <> lower(p_solicitud ->> 'email_solicitante') then
    raise exception 'La cuenta autenticada no coincide con quien solicita el intercambio.';
  end if;
  if v_tipo is null
    or v_tipo not in ('PUNTOS', 'DIRECTO')
    or v_email_propietario is null
    or lower(v_email_propietario) = v_email_solicitante then
    raise exception 'Tipo de intercambio o publicación solicitada no válido.';
  end if;

  select valor_puntos_solicitado
    into v_puntos
    from public.publicacion
   where isbn = v_isbn
     and email_propietario = v_email_propietario
     and hora_publicacion = v_hora
     and estado_publicacion = 'DISPONIBLE'
   for update;
  if not found then
    raise exception 'La publicación solicitada ya no está disponible.';
  end if;

  if v_tipo = 'DIRECTO' then
    if v_isbn_ofrecida is null
      or lower(v_email_ofrecida) <> v_email_solicitante
      or (v_isbn, v_email_propietario, v_hora) = (v_isbn_ofrecida, v_email_ofrecida, v_hora_ofrecida) then
      raise exception 'La publicación ofrecida no es válida.';
    end if;
    perform 1
      from public.publicacion
     where isbn = v_isbn_ofrecida
       and email_propietario = v_email_ofrecida
       and hora_publicacion = v_hora_ofrecida
       and estado_publicacion = 'DISPONIBLE'
     for update;
    if not found then
      raise exception 'La publicación ofrecida ya no está disponible.';
    end if;
    v_puntos := 0;
  else
    v_isbn_ofrecida := null;
    v_email_ofrecida := null;
    v_hora_ofrecida := null;
    if v_puntos is null or v_puntos <= 0 then
      raise exception 'La publicación no tiene un valor válido en puntos.';
    end if;
    update public.usuario
       set saldo_total = saldo_total - v_puntos,
           saldo_reservado = coalesce(saldo_reservado, 0) + v_puntos
     where lower(email) = v_email_solicitante
       and saldo_total >= v_puntos;
    if not found then
      raise exception 'Saldo insuficiente para reservar los puntos.';
    end if;
  end if;

  insert into public.solicitud_intercambio (
    id, tipo, estado, isbn_solicitada, email_propietario_solicitada,
    hora_publicacion_solicitada, isbn_ofrecida, email_propietario_ofrecida,
    hora_publicacion_ofrecida, email_solicitante, email_propietario, puntos
  ) values (
    v_id, v_tipo, 'PENDIENTE', v_isbn, v_email_propietario,
    v_hora, v_isbn_ofrecida, v_email_ofrecida, v_hora_ofrecida,
    v_email_solicitante, v_email_propietario, v_puntos
  );

  update public.publicacion
     set estado_publicacion = 'RESERVADA'
   where isbn = v_isbn
     and email_propietario = v_email_propietario
     and hora_publicacion = v_hora;
  if v_tipo = 'DIRECTO' then
    update public.publicacion
       set estado_publicacion = 'RESERVADA'
     where isbn = v_isbn_ofrecida
       and email_propietario = v_email_ofrecida
       and hora_publicacion = v_hora_ofrecida;
  end if;

  v_titulo := public._titulo_libro(v_isbn);
  if v_tipo = 'PUNTOS' then
    perform public._registrar_movimiento(
      v_email_solicitante, 'RESERVA', -v_puntos,
      format('Reserva de puntos para solicitar "%s"', v_titulo), v_id);
    perform public._notificar(
      v_email_propietario, 'TRADE_REQUEST', 'Nueva solicitud de intercambio por puntos',
      format('%s solicitó tu libro "%s" por %s puntos.', public._nombre_usuario(v_email_solicitante), v_titulo, v_puntos),
      'intercambios', v_id, v_isbn);
  else
    perform public._notificar(
      v_email_propietario, 'TRADE_REQUEST', 'Propuesta de intercambio directo',
      format('%s ofrece "%s" a cambio de tu libro "%s".',
        public._nombre_usuario(v_email_solicitante), public._titulo_libro(v_isbn_ofrecida), v_titulo),
      'intercambios', v_id, v_isbn);
  end if;

  return v_id;
end;
$$;

create or replace function public.gestionar_solicitud_intercambio(
  p_solicitud_id uuid,
  p_accion text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.solicitud_intercambio%rowtype;
  v_email text := lower(auth.jwt() ->> 'email');
  v_completar boolean := false;
  v_otro text;
  v_titulo text;
  v_bono integer;
begin
  select *
    into v_solicitud
    from public.solicitud_intercambio
   where id = p_solicitud_id
   for update;
  if not found then
    raise exception 'La solicitud no existe.';
  end if;
  if v_email is null
    or v_email not in (lower(v_solicitud.email_solicitante), lower(v_solicitud.email_propietario)) then
    raise exception 'No tenés permiso para modificar esta solicitud.';
  end if;

  v_otro := case when v_email = lower(v_solicitud.email_solicitante)
                 then v_solicitud.email_propietario else v_solicitud.email_solicitante end;
  v_titulo := public._titulo_libro(v_solicitud.isbn_solicitada);

  if p_accion = 'ACEPTAR' then
    if v_email <> lower(v_solicitud.email_propietario) or v_solicitud.estado <> 'PENDIENTE' then
      raise exception 'Solo el propietario puede aceptar una solicitud pendiente.';
    end if;
    v_solicitud.estado := 'ACEPTADO';
  elsif p_accion = 'RECHAZAR' then
    if v_email <> lower(v_solicitud.email_propietario) or v_solicitud.estado <> 'PENDIENTE' then
      raise exception 'Solo el propietario puede rechazar una solicitud pendiente.';
    end if;
    v_solicitud.estado := 'RECHAZADO';
  elsif p_accion = 'CANCELAR' then
    if v_solicitud.estado not in ('PENDIENTE', 'ACEPTADO') then
      raise exception 'La solicitud ya no se puede cancelar.';
    end if;
    v_solicitud.estado := 'CANCELADO';
  elsif p_accion = 'CONFIRMAR' then
    if v_solicitud.estado <> 'ACEPTADO' then
      raise exception 'Solo se puede confirmar un intercambio aceptado.';
    end if;
    if v_email = lower(v_solicitud.email_solicitante) then
      if v_solicitud.solicitante_confirmado then
        raise exception 'Ya confirmaste; falta la confirmación de la otra parte.';
      end if;
      v_solicitud.solicitante_confirmado := true;
    else
      if v_solicitud.propietario_confirmado then
        raise exception 'Ya confirmaste; falta la confirmación de la otra parte.';
      end if;
      v_solicitud.propietario_confirmado := true;
    end if;
    v_completar := v_solicitud.solicitante_confirmado and v_solicitud.propietario_confirmado;
    if v_completar then
      v_solicitud.estado := 'COMPLETADO';
    end if;
  else
    raise exception 'Acción de intercambio no válida.';
  end if;

  if v_solicitud.estado in ('RECHAZADO', 'CANCELADO') then
    if v_solicitud.tipo = 'PUNTOS' then
      update public.usuario
         set saldo_total = saldo_total + v_solicitud.puntos,
             saldo_reservado = greatest(coalesce(saldo_reservado, 0) - v_solicitud.puntos, 0)
       where lower(email) = lower(v_solicitud.email_solicitante);
      if not found then
        raise exception 'No se encontró el saldo del solicitante para liberar la reserva.';
      end if;
      perform public._registrar_movimiento(
        v_solicitud.email_solicitante, 'LIBERACION', v_solicitud.puntos,
        format('Liberación de la reserva por "%s" (%s)', v_titulo,
          case when v_solicitud.estado = 'RECHAZADO' then 'rechazada' else 'cancelada' end),
        p_solicitud_id);
    end if;
    update public.publicacion
       set estado_publicacion = 'DISPONIBLE'
     where (isbn, email_propietario, hora_publicacion) in (
       (v_solicitud.isbn_solicitada, v_solicitud.email_propietario_solicitada, v_solicitud.hora_publicacion_solicitada),
       (v_solicitud.isbn_ofrecida, v_solicitud.email_propietario_ofrecida, v_solicitud.hora_publicacion_ofrecida)
     )
       and estado_publicacion = 'RESERVADA';

    if v_solicitud.estado = 'RECHAZADO' then
      perform public._notificar(
        v_solicitud.email_solicitante, 'TRADE_REJECTED', 'Solicitud rechazada',
        format('%s no aceptó tu propuesta por "%s".', public._nombre_usuario(v_solicitud.email_propietario), v_titulo),
        'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);
    else
      perform public._notificar(
        v_otro, 'TRADE_REJECTED', 'Intercambio cancelado',
        format('%s canceló el intercambio por "%s". Los libros y puntos se liberaron.', public._nombre_usuario(v_email), v_titulo),
        'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);
    end if;

  elsif v_solicitud.estado = 'ACEPTADO' and p_accion = 'ACEPTAR' then
    perform public._notificar(
      v_solicitud.email_solicitante, 'TRADE_ACCEPTED', '¡Intercambio aceptado!',
      format('%s aceptó tu solicitud por "%s". Coordinen la entrega y confirmen la recepción.',
        public._nombre_usuario(v_solicitud.email_propietario), v_titulo),
      'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);

  elsif p_accion = 'CONFIRMAR' and not v_completar then
    perform public._notificar(
      v_otro, 'TRADE_ACCEPTED', 'La otra parte confirmó el intercambio',
      format('%s confirmó el intercambio por "%s". Falta tu confirmación para completarlo.',
        public._nombre_usuario(v_email), v_titulo),
      'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);

  elsif v_completar then
    if v_solicitud.tipo = 'PUNTOS' then
      v_bono := 10;
      update public.usuario
         set saldo_reservado = greatest(coalesce(saldo_reservado, 0) - v_solicitud.puntos, 0),
             saldo_total = saldo_total + v_bono,
             total_intercambios = total_intercambios + 1
       where lower(email) = lower(v_solicitud.email_solicitante);
      if not found then
        raise exception 'No se encontró el saldo del solicitante para completar la compra.';
      end if;
      perform public._registrar_movimiento(
        v_solicitud.email_solicitante, 'TRANSFERENCIA_ENVIADA', -v_solicitud.puntos,
        format('Pago definitivo de "%s" a %s (sale de la reserva)', v_titulo, public._nombre_usuario(v_solicitud.email_propietario)),
        p_solicitud_id);

      update public.usuario
         set saldo_total = saldo_total + v_solicitud.puntos,
             total_intercambios = total_intercambios + 1
       where lower(email) = lower(v_solicitud.email_propietario);
      if not found then
        raise exception 'No se encontró el saldo del propietario.';
      end if;
      perform public._registrar_movimiento(
        v_solicitud.email_propietario, 'TRANSFERENCIA_RECIBIDA', v_solicitud.puntos,
        format('Puntos recibidos por "%s"', v_titulo), p_solicitud_id);
      update public.usuario set saldo_total = saldo_total + v_bono
       where lower(email) = lower(v_solicitud.email_propietario);
    else
      v_bono := 5;
      update public.usuario
         set saldo_total = saldo_total + v_bono,
             total_intercambios = total_intercambios + 1
       where lower(email) in (lower(v_solicitud.email_solicitante), lower(v_solicitud.email_propietario));
      if not found then
        raise exception 'No se encontró el saldo de los participantes.';
      end if;
    end if;

    perform public._registrar_movimiento(
      v_solicitud.email_solicitante, 'BONO_INTERCAMBIO', v_bono,
      format('Bono por intercambio completado (+%s pts)', v_bono), p_solicitud_id);
    perform public._registrar_movimiento(
      v_solicitud.email_propietario, 'BONO_INTERCAMBIO', v_bono,
      format('Bono por intercambio completado (+%s pts)', v_bono), p_solicitud_id);

    update public.publicacion
       set estado_publicacion = 'VENDIDA'
     where (isbn, email_propietario, hora_publicacion) in (
       (v_solicitud.isbn_solicitada, v_solicitud.email_propietario_solicitada, v_solicitud.hora_publicacion_solicitada),
       (v_solicitud.isbn_ofrecida, v_solicitud.email_propietario_ofrecida, v_solicitud.hora_publicacion_ofrecida)
     );

    perform public._notificar(
      v_solicitud.email_solicitante, 'TRADE_COMPLETED', '¡Intercambio completado!',
      format('El intercambio por "%s" se completó. Recibiste +%s pts de bono. ¡Dejá tu reseña!', v_titulo, v_bono),
      'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);
    perform public._notificar(
      v_solicitud.email_propietario, 'TRADE_COMPLETED', '¡Intercambio completado!',
      format('El intercambio por "%s" se completó. Recibiste +%s pts de bono. ¡Dejá tu reseña!', v_titulo, v_bono),
      'intercambios', p_solicitud_id, v_solicitud.isbn_solicitada);
  end if;

  update public.solicitud_intercambio
     set estado = v_solicitud.estado,
         solicitante_confirmado = v_solicitud.solicitante_confirmado,
         propietario_confirmado = v_solicitud.propietario_confirmado,
         fecha_actualizacion = now()
   where id = p_solicitud_id;

  return jsonb_build_object(
    'estado', v_solicitud.estado,
    'solicitante_confirmado', v_solicitud.solicitante_confirmado,
    'propietario_confirmado', v_solicitud.propietario_confirmado
  );
end;
$$;

revoke all on function public.crear_solicitud_intercambio(jsonb) from public, anon;
revoke all on function public.gestionar_solicitud_intercambio(uuid, text) from public, anon;
grant execute on function public.crear_solicitud_intercambio(jsonb) to authenticated;
grant execute on function public.gestionar_solicitud_intercambio(uuid, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. RESEÑAS: calificación 1-5, solo intercambios completados, una por persona.
--    Actualiza la reputación del evaluado y premia al autor con +5 pts.
-- ------------------------------------------------------------------------------
create or replace function public.crear_resenia_intercambio(
  p_solicitud_id uuid,
  p_calificacion integer,
  p_comentario text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_solicitud public.solicitud_intercambio%rowtype;
  v_email text := lower(auth.jwt() ->> 'email');
  v_destinatario text;
  v_id uuid;
begin
  if p_calificacion is null or p_calificacion not between 1 and 5 then
    raise exception 'La calificación debe estar entre 1 y 5.';
  end if;
  if p_comentario is not null and length(p_comentario) > 500 then
    raise exception 'El comentario no puede superar los 500 caracteres.';
  end if;

  select * into v_solicitud from public.solicitud_intercambio where id = p_solicitud_id;
  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_email = lower(v_solicitud.email_solicitante) then
    v_destinatario := v_solicitud.email_propietario;
  elsif v_email = lower(v_solicitud.email_propietario) then
    v_destinatario := v_solicitud.email_solicitante;
  else
    raise exception 'No participaste en este intercambio.';
  end if;

  if v_solicitud.estado <> 'COMPLETADO' then
    raise exception 'Solo se pueden reseñar intercambios completados.';
  end if;
  if exists (
    select 1 from public.resenia_intercambio
     where solicitud_id = p_solicitud_id and lower(email_autor) = v_email
  ) then
    raise exception 'Ya reseñaste este intercambio.';
  end if;

  insert into public.resenia_intercambio (solicitud_id, email_autor, email_destinatario, calificacion, comentario, titulo_libro)
  select p_solicitud_id, u.email, v_destinatario, p_calificacion,
         nullif(trim(p_comentario), ''), public._titulo_libro(v_solicitud.isbn_solicitada)
    from public.usuario u
   where lower(u.email) = v_email
  returning id into v_id;

  update public.usuario
     set reputacion_promedio = (
           select round(avg(calificacion)::numeric, 1)
             from public.resenia_intercambio
            where lower(email_destinatario) = lower(v_destinatario)),
         total_resenias = (
           select count(*)
             from public.resenia_intercambio
            where lower(email_destinatario) = lower(v_destinatario))
   where lower(email) = lower(v_destinatario);

  update public.usuario set saldo_total = saldo_total + 5 where lower(email) = v_email;
  perform public._registrar_movimiento(v_email, 'RECOMPENSA_RESENIA', 5,
    format('Recompensa por reseñar a %s (+5 pts)', public._nombre_usuario(v_destinatario)), p_solicitud_id);

  perform public._notificar(
    v_destinatario, 'REVIEW_RECEIVED', 'Recibiste una reseña',
    format('%s te calificó con %s/5 por "%s".', public._nombre_usuario(v_email), p_calificacion,
      public._titulo_libro(v_solicitud.isbn_solicitada)),
    'perfil', p_solicitud_id, v_solicitud.isbn_solicitada);

  return v_id;
end;
$$;

revoke all on function public.crear_resenia_intercambio(uuid, integer, text) from public, anon;
grant execute on function public.crear_resenia_intercambio(uuid, integer, text) to authenticated;

-- ------------------------------------------------------------------------------
-- 6. SEGUIMIENTO: avisar a quien sigue un libro cuando se publica uno que coincide
--    (título y autor contenidos, puntos máximos y estados aceptables).
-- ------------------------------------------------------------------------------
create or replace function public.notificar_seguidores_publicacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titulo text;
  v_autor text;
  v_estados text[];
  r record;
begin
  select titulo, autores into v_titulo, v_autor from public.libro where isbn = new.isbn;
  if v_titulo is null or trim(v_titulo) = '' then
    return new;
  end if;

  v_estados := case new.estado_fisico::text
    when 'NUEVO' then array['Nuevo']
    when 'COMO_NUEVO' then array['Como nuevo']
    when 'BUEN_ESTADO' then array['Muy bueno', 'Bueno']
    when 'ACEPTABLE' then array['Aceptable']
    when 'DETERIORADO' then array['Con marcas']
    else array[]::text[]
  end;

  for r in
    select s.email_usuario
      from public.seguimiento_libro s
     where lower(s.email_usuario) <> lower(new.email_propietario)
       and v_titulo ilike '%' || trim(s.titulo) || '%'
       and (coalesce(trim(s.autor), '') = '' or coalesce(v_autor, '') ilike '%' || trim(s.autor) || '%')
       and (s.max_puntos is null or new.valor_puntos_solicitado <= s.max_puntos)
       and (s.estados_aceptables is null or cardinality(s.estados_aceptables) = 0
            or s.estados_aceptables && v_estados)
  loop
    perform public._notificar(
      r.email_usuario, 'TRACKER_MATCH', 'Apareció un libro que seguís',
      format('Se publicó "%s" por %s pts. ¡Pedilo antes que otro!', v_titulo, new.valor_puntos_solicitado),
      'inicio', null, new.isbn);
  end loop;
  return new;
end;
$$;

revoke all on function public.notificar_seguidores_publicacion() from public, anon, authenticated;

drop trigger if exists notificar_seguidores_publicacion on public.publicacion;
create trigger notificar_seguidores_publicacion
  after insert on public.publicacion
  for each row execute function public.notificar_seguidores_publicacion();

-- ------------------------------------------------------------------------------
-- 7. Movimiento inicial al crear un usuario (100 pts de bienvenida)
-- ------------------------------------------------------------------------------
create or replace function public.registrar_saldo_inicial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.movimiento_puntos_app (email_usuario, tipo, monto, saldo_resultante, descripcion)
  values (new.email, 'INICIAL', coalesce(new.saldo_total, 0), coalesce(new.saldo_total, 0),
          'Bienvenida a MercadoLibro: puntos iniciales');
  return new;
end;
$$;
revoke all on function public.registrar_saldo_inicial() from public, anon, authenticated;

drop trigger if exists registrar_saldo_inicial on public.usuario;
create trigger registrar_saldo_inicial
  after insert on public.usuario
  for each row execute function public.registrar_saldo_inicial();

-- ------------------------------------------------------------------------------
-- 8. Reinicio de cuentas de demo (reemplaza el update directo de saldo, que ya no
--    está permitido). Solo funciona para emails @mercadolibro.demo.
-- ------------------------------------------------------------------------------
create or replace function public.reiniciar_usuario_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
begin
  if v_email is null or v_email not like '%@mercadolibro.demo' then
    raise exception 'Solo disponible para cuentas de demo.';
  end if;

  update public.solicitud_intercambio
     set estado = 'CANCELADO', fecha_actualizacion = now()
   where estado in ('PENDIENTE', 'ACEPTADO')
     and (lower(email_solicitante) = v_email or lower(email_propietario) = v_email);
  update public.publicacion
     set estado_publicacion = 'ELIMINADA'
   where lower(email_propietario) = v_email and estado_publicacion <> 'ELIMINADA';
  delete from public.notificacion_app where lower(email_usuario) = v_email;
  delete from public.movimiento_puntos_app where lower(email_usuario) = v_email;
  delete from public.seguimiento_libro where lower(email_usuario) = v_email;
  delete from public.resenia_intercambio where lower(email_autor) = v_email or lower(email_destinatario) = v_email;
  update public.usuario
     set saldo_total = 100, saldo_reservado = 0, reputacion_promedio = 5,
         total_intercambios = 0, total_resenias = 0
   where lower(email) = v_email;
  perform public._registrar_movimiento(v_email, 'INICIAL', 100, 'Saldo inicial de la demo', null);
end;
$$;
revoke all on function public.reiniciar_usuario_demo() from public, anon;
grant execute on function public.reiniciar_usuario_demo() to authenticated;

-- ------------------------------------------------------------------------------
-- 9. Datos existentes: contadores e historial de arranque
-- ------------------------------------------------------------------------------
update public.usuario u
   set total_intercambios = (
     select count(*) from public.solicitud_intercambio s
      where s.estado = 'COMPLETADO'
        and lower(u.email) in (lower(s.email_solicitante), lower(s.email_propietario)));

insert into public.movimiento_puntos_app (email_usuario, tipo, monto, saldo_resultante, descripcion)
select u.email, 'INICIAL', coalesce(u.saldo_total, 0), coalesce(u.saldo_total, 0),
       'Saldo disponible al activar el historial de movimientos'
  from public.usuario u
 where not exists (
   select 1 from public.movimiento_puntos_app m where lower(m.email_usuario) = lower(u.email));
