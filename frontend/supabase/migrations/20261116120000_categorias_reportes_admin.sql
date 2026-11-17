-- ==============================================================================
-- MercadoLibro: categorías de libros, reportes, panel de administración
-- y gestión de conflictos (Sprint 3 / Sprint 6).
--
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de
-- 20261114120000_seguridad_y_persistencia.sql. Es idempotente.
--
-- Para dar permisos de administrador a una cuenta:
--   update public.usuario set rol = 'ADMINISTRADOR' where email = 'alguien@ejemplo.com';
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATEGORÍAS: las mismas que usa el catálogo del frontend.
--    La categoría es del libro (ISBN). Cualquier usuario autenticado puede
--    asignarla si el libro todavía no tiene una; no se puede pisar ni borrar.
-- ------------------------------------------------------------------------------

-- La base de la demo tiene un trigger creado a mano que compara
-- NEW.categoria_padre_id con NEW.id, pero la clave de categoria es "nombre":
-- cualquier insert fallaba con 'record "new" has no field "id"'.
-- Se redefine la función (el trigger existente la sigue usando) con la columna
-- correcta, evitando autorreferencias y ciclos en la jerarquía.
create or replace function public.fn_evitar_ciclo_categoria()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actual varchar(255) := NEW.categoria_padre_id;
  v_pasos  integer := 0;
begin
  if NEW.categoria_padre_id is null then
    return NEW;
  end if;
  if NEW.categoria_padre_id = NEW.nombre then
    raise exception 'Una categoría no puede ser su propia categoría padre';
  end if;
  while v_actual is not null loop
    if v_actual = NEW.nombre then
      raise exception 'La categoría padre genera un ciclo en la jerarquía';
    end if;
    v_pasos := v_pasos + 1;
    exit when v_pasos > 1000;
    select c.categoria_padre_id into v_actual
      from public.categoria c
     where c.nombre = v_actual;
  end loop;
  return NEW;
end;
$$;

insert into public.categoria (nombre)
values
  ('Ficción'), ('No ficción'), ('Ciencia'), ('Historia'), ('Infantil'), ('Poesía'),
  ('Técnico'), ('Autoayuda'), ('Comics y novela gráfica'), ('Filosofía'), ('Biografía')
on conflict (nombre) do nothing;

alter table public.categoria enable row level security;
revoke insert, update, delete on public.categoria from anon, authenticated;
grant select on public.categoria to anon, authenticated;
drop policy if exists "Lectura de categorias" on public.categoria;
create policy "Lectura de categorias"
  on public.categoria for select
  using (true);

revoke insert, update, delete on public.libro_categoria from anon, authenticated;
grant select on public.libro_categoria to anon, authenticated;
grant insert on public.libro_categoria to authenticated;
drop policy if exists "Asignar categoria a libro sin categoria" on public.libro_categoria;
create policy "Asignar categoria a libro sin categoria"
  on public.libro_categoria for insert to authenticated
  with check (
    exists (select 1 from public.libro l where l.isbn = libro_categoria.isbn)
    and not exists (select 1 from public.libro_categoria lc where lc.isbn = libro_categoria.isbn)
  );

-- ------------------------------------------------------------------------------
-- 2. ADMINISTRADORES y cuentas suspendidas
-- ------------------------------------------------------------------------------
create or replace function public._es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuario
     where lower(email) = lower(auth.jwt() ->> 'email')
       and rol::text = 'ADMINISTRADOR'
       and coalesce(es_activo, true)
  )
$$;
revoke all on function public._es_admin() from public, anon;
grant execute on function public._es_admin() to authenticated;

create or replace function public._cuenta_activa(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select es_activo from public.usuario where lower(email) = lower(p_email)), true)
$$;
revoke all on function public._cuenta_activa(text) from public, anon, authenticated;

-- Una cuenta suspendida no puede publicar ni pedir intercambios.
create or replace function public.bloquear_cuenta_suspendida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- IF (y no CASE): PL/pgSQL solo resuelve el campo de la rama que se ejecuta.
  if tg_table_name = 'publicacion' then
    v_email := new.email_propietario;
  else
    v_email := new.email_solicitante;
  end if;
  if not public._cuenta_activa(v_email) then
    raise exception 'Tu cuenta está suspendida. Contactá a un administrador.';
  end if;
  return new;
end;
$$;
revoke all on function public.bloquear_cuenta_suspendida() from public, anon, authenticated;

drop trigger if exists bloquear_cuenta_suspendida on public.publicacion;
create trigger bloquear_cuenta_suspendida
  before insert on public.publicacion
  for each row execute function public.bloquear_cuenta_suspendida();

drop trigger if exists bloquear_cuenta_suspendida on public.solicitud_intercambio;
create trigger bloquear_cuenta_suspendida
  before insert on public.solicitud_intercambio
  for each row execute function public.bloquear_cuenta_suspendida();

-- ------------------------------------------------------------------------------
-- 3. REPORTES (denuncias de usuarios, publicaciones o intercambios)
-- ------------------------------------------------------------------------------
create table if not exists public.reporte_app (
  id uuid primary key default gen_random_uuid(),
  email_denunciante varchar(255) not null references public.usuario(email) on update cascade on delete cascade,
  tipo text not null check (tipo in ('USUARIO', 'PUBLICACION', 'INTERCAMBIO')),
  email_denunciado varchar(255) references public.usuario(email) on update cascade on delete set null,
  isbn varchar(255),
  hora_publicacion timestamp,
  solicitud_id uuid references public.solicitud_intercambio(id) on delete set null,
  motivo text not null check (motivo in (
    'LIBRO_NO_ENTREGADO', 'LIBRO_EN_MAL_ESTADO', 'PUBLICACION_ENGANOSA',
    'COMPORTAMIENTO_INAPROPIADO', 'FRAUDE', 'OTRO'
  )),
  detalle varchar(1000),
  estado text not null default 'ABIERTO' check (estado in ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO')),
  resolucion varchar(1000),
  accion_tomada text,
  email_resolutor varchar(255),
  fecha timestamptz not null default now(),
  fecha_resolucion timestamptz
);
create index if not exists reporte_app_estado_idx on public.reporte_app (estado, fecha desc);
alter table public.reporte_app enable row level security;
revoke all on public.reporte_app from anon, authenticated;
grant select on public.reporte_app to authenticated;
drop policy if exists "Ver reportes propios o como admin" on public.reporte_app;
create policy "Ver reportes propios o como admin"
  on public.reporte_app for select to authenticated
  using (lower(auth.jwt() ->> 'email') = lower(email_denunciante) or public._es_admin());

-- Ampliar los tipos de notificación con los avisos de reportes.
alter table public.notificacion_app drop constraint if exists notificacion_app_tipo_check;
alter table public.notificacion_app add constraint notificacion_app_tipo_check check (tipo in (
  'TRADE_REQUEST', 'TRADE_ACCEPTED', 'TRADE_REJECTED', 'TRADE_COMPLETED',
  'TRACKER_MATCH', 'CHAIN_DETECTED', 'POINTS_RECEIVED', 'REVIEW_RECEIVED', 'REPORT_UPDATE'
));

create or replace function public.crear_reporte(
  p_tipo text,
  p_motivo text,
  p_detalle text,
  p_email_denunciado text default null,
  p_isbn text default null,
  p_hora_publicacion timestamp default null,
  p_solicitud_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_denunciado text := lower(nullif(trim(p_email_denunciado), ''));
  v_solicitud public.solicitud_intercambio%rowtype;
  v_id uuid;
begin
  if v_email is null then
    raise exception 'Tenés que iniciar sesión para reportar.';
  end if;
  if p_detalle is not null and length(p_detalle) > 1000 then
    raise exception 'El detalle no puede superar los 1000 caracteres.';
  end if;

  if p_tipo = 'INTERCAMBIO' then
    select * into v_solicitud from public.solicitud_intercambio where id = p_solicitud_id;
    if not found then
      raise exception 'El intercambio no existe.';
    end if;
    if v_email not in (lower(v_solicitud.email_solicitante), lower(v_solicitud.email_propietario)) then
      raise exception 'Solo podés reportar intercambios en los que participaste.';
    end if;
    v_denunciado := case when v_email = lower(v_solicitud.email_solicitante)
                         then lower(v_solicitud.email_propietario) else lower(v_solicitud.email_solicitante) end;
  elsif p_tipo = 'PUBLICACION' then
    select lower(email_propietario) into v_denunciado
      from public.publicacion
     where isbn = p_isbn and hora_publicacion = p_hora_publicacion
       and lower(email_propietario) = coalesce(v_denunciado, lower(email_propietario))
     limit 1;
    if v_denunciado is null then
      raise exception 'La publicación no existe.';
    end if;
  elsif p_tipo = 'USUARIO' then
    if v_denunciado is null or not exists (select 1 from public.usuario where lower(email) = v_denunciado) then
      raise exception 'El usuario no existe.';
    end if;
  else
    raise exception 'Tipo de reporte no válido.';
  end if;

  if v_denunciado = v_email then
    raise exception 'No podés reportarte a vos mismo.';
  end if;
  if exists (
    select 1 from public.reporte_app
     where lower(email_denunciante) = v_email
       and tipo = p_tipo
       and estado in ('ABIERTO', 'EN_REVISION')
       and case p_tipo
             when 'INTERCAMBIO' then solicitud_id = p_solicitud_id
             when 'PUBLICACION' then isbn = p_isbn and hora_publicacion = p_hora_publicacion
             else lower(coalesce(email_denunciado, '')) = v_denunciado
           end
  ) then
    raise exception 'Ya tenés un reporte abierto sobre esto. Un administrador lo va a revisar.';
  end if;

  insert into public.reporte_app (
    email_denunciante, tipo, email_denunciado, isbn, hora_publicacion, solicitud_id, motivo, detalle
  )
  select u.email, p_tipo, (select email from public.usuario where lower(email) = v_denunciado),
         case when p_tipo = 'PUBLICACION' then p_isbn else v_solicitud.isbn_solicitada end,
         case when p_tipo = 'PUBLICACION' then p_hora_publicacion else null end,
         case when p_tipo = 'INTERCAMBIO' then p_solicitud_id else null end,
         p_motivo, nullif(trim(p_detalle), '')
    from public.usuario u
   where lower(u.email) = v_email
  returning id into v_id;

  -- Avisar a los administradores.
  insert into public.notificacion_app (email_usuario, tipo, titulo, mensaje, pantalla)
  select email, 'REPORT_UPDATE', 'Nuevo reporte para revisar',
         format('%s reportó %s (%s).', public._nombre_usuario(v_email),
           case p_tipo when 'USUARIO' then 'a un usuario' when 'PUBLICACION' then 'una publicación' else 'un intercambio' end,
           replace(lower(p_motivo), '_', ' ')),
         'admin'
    from public.usuario
   where rol::text = 'ADMINISTRADOR' and coalesce(es_activo, true);

  return v_id;
end;
$$;
revoke all on function public.crear_reporte(text, text, text, text, text, timestamp, uuid) from public, anon;
grant execute on function public.crear_reporte(text, text, text, text, text, timestamp, uuid) to authenticated;

-- ------------------------------------------------------------------------------
-- 4. GESTIÓN DE CONFLICTOS (solo administradores)
--    Acciones: NINGUNA, CANCELAR_INTERCAMBIO (devuelve puntos y libera libros),
--    ELIMINAR_PUBLICACION, SUSPENDER_USUARIO.
-- ------------------------------------------------------------------------------
create or replace function public.resolver_reporte(
  p_reporte_id uuid,
  p_estado text,
  p_resolucion text,
  p_accion text default 'NINGUNA'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text := lower(auth.jwt() ->> 'email');
  v_reporte public.reporte_app%rowtype;
  v_solicitud public.solicitud_intercambio%rowtype;
  v_titulo text;
begin
  if not public._es_admin() then
    raise exception 'Solo un administrador puede gestionar reportes.';
  end if;
  if p_estado not in ('EN_REVISION', 'RESUELTO', 'DESCARTADO') then
    raise exception 'Estado de reporte no válido.';
  end if;
  if coalesce(p_accion, 'NINGUNA') not in ('NINGUNA', 'CANCELAR_INTERCAMBIO', 'ELIMINAR_PUBLICACION', 'SUSPENDER_USUARIO') then
    raise exception 'Acción no válida.';
  end if;

  select * into v_reporte from public.reporte_app where id = p_reporte_id for update;
  if not found then
    raise exception 'El reporte no existe.';
  end if;

  if p_accion = 'CANCELAR_INTERCAMBIO' then
    select * into v_solicitud from public.solicitud_intercambio where id = v_reporte.solicitud_id for update;
    if not found then
      raise exception 'El reporte no tiene un intercambio asociado.';
    end if;
    if v_solicitud.estado not in ('PENDIENTE', 'ACEPTADO') then
      raise exception 'El intercambio ya está %; no se puede cancelar.', lower(v_solicitud.estado::text);
    end if;
    v_titulo := public._titulo_libro(v_solicitud.isbn_solicitada);
    if v_solicitud.tipo = 'PUNTOS' then
      update public.usuario
         set saldo_total = saldo_total + v_solicitud.puntos,
             saldo_reservado = greatest(coalesce(saldo_reservado, 0) - v_solicitud.puntos, 0)
       where lower(email) = lower(v_solicitud.email_solicitante);
      perform public._registrar_movimiento(
        v_solicitud.email_solicitante, 'LIBERACION', v_solicitud.puntos,
        format('Devolución de la reserva por "%s" (cancelado por un administrador)', v_titulo), v_solicitud.id);
    end if;
    update public.publicacion
       set estado_publicacion = 'DISPONIBLE'
     where (isbn, email_propietario, hora_publicacion) in (
       (v_solicitud.isbn_solicitada, v_solicitud.email_propietario_solicitada, v_solicitud.hora_publicacion_solicitada),
       (v_solicitud.isbn_ofrecida, v_solicitud.email_propietario_ofrecida, v_solicitud.hora_publicacion_ofrecida)
     )
       and estado_publicacion = 'RESERVADA';
    update public.solicitud_intercambio
       set estado = 'CANCELADO', fecha_actualizacion = now()
     where id = v_solicitud.id;
    perform public._notificar(v_solicitud.email_solicitante, 'TRADE_REJECTED', 'Intercambio cancelado por un administrador',
      format('El intercambio por "%s" se canceló tras revisar un reporte. Los puntos y libros se liberaron.', v_titulo),
      'intercambios', v_solicitud.id, v_solicitud.isbn_solicitada);
    perform public._notificar(v_solicitud.email_propietario, 'TRADE_REJECTED', 'Intercambio cancelado por un administrador',
      format('El intercambio por "%s" se canceló tras revisar un reporte. Los puntos y libros se liberaron.', v_titulo),
      'intercambios', v_solicitud.id, v_solicitud.isbn_solicitada);

  elsif p_accion = 'ELIMINAR_PUBLICACION' then
    if v_reporte.isbn is null or v_reporte.hora_publicacion is null then
      raise exception 'El reporte no tiene una publicación asociada.';
    end if;
    if exists (
      select 1 from public.publicacion
       where isbn = v_reporte.isbn and hora_publicacion = v_reporte.hora_publicacion
         and lower(email_propietario) = lower(v_reporte.email_denunciado)
         and estado_publicacion = 'RESERVADA'
    ) then
      raise exception 'La publicación tiene un intercambio en curso; cancelalo primero.';
    end if;
    update public.publicacion
       set estado_publicacion = 'ELIMINADA'
     where isbn = v_reporte.isbn and hora_publicacion = v_reporte.hora_publicacion
       and lower(email_propietario) = lower(v_reporte.email_denunciado)
       and estado_publicacion = 'DISPONIBLE';
    perform public._notificar(v_reporte.email_denunciado, 'REPORT_UPDATE', 'Publicación dada de baja',
      format('Un administrador eliminó tu publicación de "%s" tras revisar un reporte.', public._titulo_libro(v_reporte.isbn)),
      'perfil', null, v_reporte.isbn);

  elsif p_accion = 'SUSPENDER_USUARIO' then
    if v_reporte.email_denunciado is null then
      raise exception 'El reporte no tiene un usuario asociado.';
    end if;
    if lower(v_reporte.email_denunciado) = v_admin then
      raise exception 'No podés suspender tu propia cuenta.';
    end if;
    update public.usuario set es_activo = false where lower(email) = lower(v_reporte.email_denunciado);
    -- Sus publicaciones disponibles dejan de mostrarse.
    update public.publicacion
       set estado_publicacion = 'ELIMINADA'
     where lower(email_propietario) = lower(v_reporte.email_denunciado)
       and estado_publicacion = 'DISPONIBLE';
    perform public._notificar(v_reporte.email_denunciado, 'REPORT_UPDATE', 'Cuenta suspendida',
      'Tu cuenta fue suspendida tras revisar un reporte. No vas a poder publicar ni pedir intercambios.',
      'perfil', null, null);
  end if;

  update public.reporte_app
     set estado = p_estado,
         resolucion = nullif(trim(p_resolucion), ''),
         accion_tomada = case when coalesce(p_accion, 'NINGUNA') = 'NINGUNA' then accion_tomada else p_accion end,
         email_resolutor = v_admin,
         fecha_resolucion = case when p_estado in ('RESUELTO', 'DESCARTADO') then now() else null end
   where id = p_reporte_id;

  if p_estado in ('RESUELTO', 'DESCARTADO') then
    perform public._notificar(v_reporte.email_denunciante, 'REPORT_UPDATE',
      case when p_estado = 'RESUELTO' then 'Tu reporte fue resuelto' else 'Tu reporte fue revisado' end,
      coalesce(nullif(trim(p_resolucion), ''), 'Un administrador revisó tu reporte.'),
      'notificaciones', null, null);
  end if;
end;
$$;
revoke all on function public.resolver_reporte(uuid, text, text, text) from public, anon;
grant execute on function public.resolver_reporte(uuid, text, text, text) to authenticated;

create or replace function public.reactivar_usuario(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._es_admin() then
    raise exception 'Solo un administrador puede reactivar cuentas.';
  end if;
  update public.usuario set es_activo = true where lower(email) = lower(p_email);
  perform public._notificar(p_email, 'REPORT_UPDATE', 'Cuenta reactivada',
    'Un administrador reactivó tu cuenta. Ya podés volver a publicar e intercambiar.', 'perfil', null, null);
end;
$$;
revoke all on function public.reactivar_usuario(text) from public, anon;
grant execute on function public.reactivar_usuario(text) to authenticated;

-- ------------------------------------------------------------------------------
-- 5. REPORTE GENERAL para el panel de administración
-- ------------------------------------------------------------------------------
create or replace function public.estadisticas_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public._es_admin() then
    raise exception 'Solo un administrador puede ver las estadísticas.';
  end if;
  return jsonb_build_object(
    'usuarios', (select count(*) from public.usuario),
    'usuarios_suspendidos', (select count(*) from public.usuario where not coalesce(es_activo, true)),
    'publicaciones_disponibles', (select count(*) from public.publicacion where estado_publicacion = 'DISPONIBLE'),
    'publicaciones_reservadas', (select count(*) from public.publicacion where estado_publicacion = 'RESERVADA'),
    'publicaciones_intercambiadas', (select count(*) from public.publicacion where estado_publicacion = 'VENDIDA'),
    'intercambios_por_estado', coalesce((
      select jsonb_object_agg(estado, total)
        from (select estado::text as estado, count(*) as total from public.solicitud_intercambio group by estado) e
    ), '{}'::jsonb),
    'intercambios_por_tipo', coalesce((
      select jsonb_object_agg(tipo, total)
        from (select tipo::text as tipo, count(*) as total from public.solicitud_intercambio group by tipo) t
    ), '{}'::jsonb),
    'puntos_en_circulacion', (select coalesce(sum(saldo_total), 0) from public.usuario),
    'puntos_reservados', (select coalesce(sum(saldo_reservado), 0) from public.usuario),
    'reputacion_promedio', (select round(avg(reputacion_promedio)::numeric, 2) from public.usuario),
    'resenias', (select count(*) from public.resenia_intercambio),
    'reportes_abiertos', (select count(*) from public.reporte_app where estado in ('ABIERTO', 'EN_REVISION')),
    'reportes_cerrados', (select count(*) from public.reporte_app where estado in ('RESUELTO', 'DESCARTADO')),
    'categorias_populares', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', categoria, 'publicaciones', total) order by total desc)
        from (
          select coalesce(lc.nombre_categoria, 'Sin categoría') as categoria, count(*) as total
            from public.publicacion p
            left join public.libro_categoria lc on lc.isbn = p.isbn
           where p.estado_publicacion <> 'ELIMINADA'
           group by 1
           order by 2 desc
           limit 6
        ) c
    ), '[]'::jsonb),
    'usuarios_mas_activos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'email', email, 'nombre', public._nombre_usuario(email),
               'intercambios', total_intercambios, 'reputacion', reputacion_promedio)
             order by total_intercambios desc)
        from (select email, total_intercambios, reputacion_promedio
                from public.usuario order by total_intercambios desc, reputacion_promedio desc limit 5) u
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.estadisticas_admin() from public, anon;
grant execute on function public.estadisticas_admin() to authenticated;

-- Listado de intercambios en curso con más de 7 días sin movimiento (posibles conflictos).
create or replace function public.intercambios_estancados_admin(p_dias integer default 7)
returns table (
  id uuid, tipo text, estado text, titulo text, solicitante text, propietario text,
  puntos integer, solicitante_confirmado boolean, propietario_confirmado boolean, fecha_actualizacion timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public._es_admin() then
    raise exception 'Solo un administrador puede ver esta información.';
  end if;
  return query
    select s.id, s.tipo::text, s.estado::text, public._titulo_libro(s.isbn_solicitada),
           public._nombre_usuario(s.email_solicitante), public._nombre_usuario(s.email_propietario),
           s.puntos, s.solicitante_confirmado, s.propietario_confirmado, s.fecha_actualizacion::timestamptz
      from public.solicitud_intercambio s
     where s.estado in ('PENDIENTE', 'ACEPTADO')
       and s.fecha_actualizacion < now() - make_interval(days => greatest(coalesce(p_dias, 7), 0))
     order by s.fecha_actualizacion;
end;
$$;
revoke all on function public.intercambios_estancados_admin(integer) from public, anon;
grant execute on function public.intercambios_estancados_admin(integer) to authenticated;

-- El reinicio de cuentas de demo también limpia sus reportes.
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
  delete from public.reporte_app where lower(email_denunciante) = v_email or lower(email_denunciado) = v_email;
  update public.usuario
     set saldo_total = 100, saldo_reservado = 0, reputacion_promedio = 5,
         total_intercambios = 0, total_resenias = 0, es_activo = true
   where lower(email) = v_email;
  perform public._registrar_movimiento(v_email, 'INICIAL', 100, 'Saldo inicial de la demo', null);
end;
$$;
revoke all on function public.reiniciar_usuario_demo() from public, anon;
grant execute on function public.reiniciar_usuario_demo() to authenticated;
