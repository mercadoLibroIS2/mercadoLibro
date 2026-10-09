-- ==============================================================================
-- MercadoLibro: Configuración de RLS y Trigger para la tabla 'usuario'
-- Ejecutar en el SQL Editor de Supabase
-- ==============================================================================

-- 1. Habilitar Row Level Security (RLS) en la tabla usuario
alter table public.usuario enable row level security;

-- Permitir que el Frontend pueda leer los perfiles públicos de los usuarios
drop policy if exists "Permitir lectura publica de usuarios" on public.usuario;
create policy "Permitir lectura publica de usuarios" 
  on public.usuario for select 
  using (true);

-- Permitir que cada usuario pueda actualizar únicamente su propia fila
drop policy if exists "Permitir al usuario editar su registro" on public.usuario;
create policy "Permitir al usuario editar su registro" 
  on public.usuario for update 
  using (auth.jwt() ->> 'email' = email);

-- Permitir inserción durante el registro (por seguridad adicional)
drop policy if exists "Permitir insercion de usuario propio" on public.usuario;
create policy "Permitir insercion de usuario propio" 
  on public.usuario for insert 
  with check (auth.jwt() ->> 'email' = email);

-- 2. Robot automático (Trigger)
-- Cuando alguien se registra en Supabase Auth, se inserta automáticamente
-- su registro en la tabla usuario con los 100 puntos iniciales (RF14).
create or replace function public.handle_new_user()
returns trigger as $$
declare
  app_username text;
begin
  app_username := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuario' and column_name = 'contrasenia'
  ) then
    insert into public.usuario (
      id, email, nombre, contrasenia, saldo_total, saldo_reservado,
      reputacion_promedio, rol, es_activo
    )
    values (
      new.id, new.email, app_username, new.encrypted_password,
      100, 0, 5.0, 'USUARIO', true
    )
    on conflict (email) do nothing;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuario' and column_name = 'nombre_usuario'
  ) then
    insert into public.usuario (
      email, nombre_usuario, saldo_total, saldo_reservado,
      reputacion_promedio, notificacion_email, notificacion_inapp
    )
    values (
      new.email, app_username, 100, 0, 5.0, true, true
    )
    on conflict (email) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Conectar el trigger a los registros de Supabase
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Admitir libros identificados por ISBN hasta integrar Google Books
alter table public.libro alter column google_books_id drop not null;
alter table public.libro alter column titulo drop not null;

-- Vincular cuentas de Supabase ya existentes con la tabla usada por publicaciones.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuario' and column_name = 'contrasenia'
  ) then
    insert into public.usuario (
      id, email, nombre, contrasenia, saldo_total, saldo_reservado,
      reputacion_promedio, rol, es_activo
    )
    select
      users.id,
      users.email,
      lower(coalesce(users.raw_user_meta_data->>'username', split_part(users.email, '@', 1))),
      users.encrypted_password,
      100,
      0,
      5.0,
      'USUARIO',
      true
    from auth.users users
    where users.email is not null
    on conflict (email) do nothing;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuario' and column_name = 'nombre_usuario'
  ) then
    insert into public.usuario (
      email, nombre_usuario, saldo_total, saldo_reservado,
      reputacion_promedio, notificacion_email, notificacion_inapp
    )
    select
      users.email,
      lower(coalesce(users.raw_user_meta_data->>'username', split_part(users.email, '@', 1))),
      100,
      0,
      5.0,
      true,
      true
    from auth.users users
    where users.email is not null
    on conflict (email) do nothing;
  end if;
end;
$$;

-- 5. Permisos de lectura y escritura de publicaciones desde la aplicación
drop policy if exists "Insertar libro por ISBN" on public.libro;
create policy "Insertar libro por ISBN"
  on public.libro for insert
  with check (auth.role() = 'authenticated');

alter table public.publicacion enable row level security;
alter table public.libro enable row level security;
alter table public.libro_categoria enable row level security;

drop policy if exists "Lectura de libros del catalogo" on public.libro;
create policy "Lectura de libros del catalogo"
  on public.libro for select
  using (true);

drop policy if exists "Lectura de categorias de libros" on public.libro_categoria;
create policy "Lectura de categorias de libros"
  on public.libro_categoria for select
  using (true);

drop policy if exists "Lectura de publicaciones activas" on public.publicacion;
create policy "Lectura de publicaciones activas"
  on public.publicacion for select
  using (estado_publicacion <> 'ELIMINADA' or auth.jwt() ->> 'email' = email_propietario);

drop policy if exists "Crear publicacion propia" on public.publicacion;
create policy "Crear publicacion propia"
  on public.publicacion for insert
  with check (auth.jwt() ->> 'email' = email_propietario);

drop policy if exists "Editar publicacion propia" on public.publicacion;
create policy "Editar publicacion propia"
  on public.publicacion for update
  using (auth.jwt() ->> 'email' = email_propietario)
  with check (auth.jwt() ->> 'email' = email_propietario);

-- 6. Persistir solicitudes de puntos y trueques directos del frontend.
create table if not exists public.solicitud_intercambio (
  id uuid primary key,
  tipo text not null check (tipo in ('PUNTOS', 'DIRECTO')),
  estado text not null check (estado in ('PENDIENTE', 'ACEPTADO', 'RECHAZADO', 'CANCELADO', 'COMPLETADO')),
  isbn_solicitada varchar(255) not null,
  email_propietario_solicitada varchar(255) not null,
  hora_publicacion_solicitada timestamp not null,
  isbn_ofrecida varchar(255),
  email_propietario_ofrecida varchar(255),
  hora_publicacion_ofrecida timestamp,
  email_solicitante varchar(255) not null references public.usuario(email) on update cascade,
  email_propietario varchar(255) not null references public.usuario(email) on update cascade,
  puntos integer not null check (puntos >= 0),
  solicitante_confirmado boolean not null default false,
  propietario_confirmado boolean not null default false,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  constraint solicitud_publicacion_solicitada_fk
    foreign key (isbn_solicitada, email_propietario_solicitada, hora_publicacion_solicitada)
    references public.publicacion (isbn, email_propietario, hora_publicacion),
  constraint solicitud_publicacion_ofrecida_fk
    foreign key (isbn_ofrecida, email_propietario_ofrecida, hora_publicacion_ofrecida)
    references public.publicacion (isbn, email_propietario, hora_publicacion),
  constraint solicitud_tipo_detalle_check check (
    (tipo = 'PUNTOS' and isbn_ofrecida is null and email_propietario_ofrecida is null
      and hora_publicacion_ofrecida is null and puntos > 0)
    or
    (tipo = 'DIRECTO' and isbn_ofrecida is not null and email_propietario_ofrecida is not null
      and hora_publicacion_ofrecida is not null and puntos = 0)
  )
);

alter table public.solicitud_intercambio enable row level security;
grant select on public.solicitud_intercambio to authenticated;
revoke insert, update, delete on public.solicitud_intercambio from anon, authenticated;

drop policy if exists "Ver solicitudes propias" on public.solicitud_intercambio;
create policy "Ver solicitudes propias"
  on public.solicitud_intercambio for select
  using (
    lower(auth.jwt() ->> 'email') = lower(email_solicitante)
    or lower(auth.jwt() ->> 'email') = lower(email_propietario)
  );

drop policy if exists "Actualizar solicitudes propias" on public.solicitud_intercambio;

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
  v_estado text;
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
      v_solicitud.solicitante_confirmado := true;
    else
      v_solicitud.propietario_confirmado := true;
    end if;
    v_completar := v_solicitud.solicitante_confirmado
      and (v_solicitud.tipo = 'PUNTOS' or v_solicitud.propietario_confirmado);
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
    end if;
    update public.publicacion
       set estado_publicacion = 'DISPONIBLE'
     where (isbn, email_propietario, hora_publicacion) in (
       (v_solicitud.isbn_solicitada, v_solicitud.email_propietario_solicitada, v_solicitud.hora_publicacion_solicitada),
       (v_solicitud.isbn_ofrecida, v_solicitud.email_propietario_ofrecida, v_solicitud.hora_publicacion_ofrecida)
     )
       and estado_publicacion = 'RESERVADA';
  elsif v_completar then
    if v_solicitud.tipo = 'PUNTOS' then
      update public.usuario
         set saldo_reservado = greatest(coalesce(saldo_reservado, 0) - v_solicitud.puntos, 0),
             saldo_total = saldo_total + 10
       where lower(email) = lower(v_solicitud.email_solicitante);
      if not found then
        raise exception 'No se encontró el saldo del solicitante para completar la compra.';
      end if;
      update public.usuario
         set saldo_total = saldo_total + v_solicitud.puntos + 10
       where lower(email) = lower(v_solicitud.email_propietario);
      if not found then
        raise exception 'No se encontró el saldo del propietario.';
      end if;
    else
      update public.usuario
         set saldo_total = saldo_total + 5
       where lower(email) = lower(v_solicitud.email_solicitante);
      if not found then
        raise exception 'No se encontró el saldo del solicitante.';
      end if;
      update public.usuario
         set saldo_total = saldo_total + 5
       where lower(email) = lower(v_solicitud.email_propietario);
      if not found then
        raise exception 'No se encontró el saldo del propietario.';
      end if;
    end if;
    update public.publicacion
       set estado_publicacion = 'VENDIDA'
     where (isbn, email_propietario, hora_publicacion) in (
       (v_solicitud.isbn_solicitada, v_solicitud.email_propietario_solicitada, v_solicitud.hora_publicacion_solicitada),
       (v_solicitud.isbn_ofrecida, v_solicitud.email_propietario_ofrecida, v_solicitud.hora_publicacion_ofrecida)
     );
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
