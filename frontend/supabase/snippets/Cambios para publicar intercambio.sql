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
grant select, insert, update on public.solicitud_intercambio to authenticated;

drop policy if exists "Ver solicitudes propias" on public.solicitud_intercambio;
create policy "Ver solicitudes propias"
  on public.solicitud_intercambio for select
  using (
    lower(auth.jwt() ->> 'email') = lower(email_solicitante)
    or lower(auth.jwt() ->> 'email') = lower(email_propietario)
  );

drop policy if exists "Crear solicitudes propias" on public.solicitud_intercambio;
create policy "Crear solicitudes propias"
  on public.solicitud_intercambio for insert
  with check (lower(auth.jwt() ->> 'email') = lower(email_solicitante));

drop policy if exists "Actualizar solicitudes propias" on public.solicitud_intercambio;
create policy "Actualizar solicitudes propias"
  on public.solicitud_intercambio for update
  using (
    lower(auth.jwt() ->> 'email') = lower(email_solicitante)
    or lower(auth.jwt() ->> 'email') = lower(email_propietario)
  )
  with check (
    lower(auth.jwt() ->> 'email') = lower(email_solicitante)
    or lower(auth.jwt() ->> 'email') = lower(email_propietario)
  );
