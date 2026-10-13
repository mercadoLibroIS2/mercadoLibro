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
