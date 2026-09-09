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
begin
  insert into public.usuario (
    email,
    nombre_usuario,
    saldo_total,
    saldo_reservado,
    reputacion_promedio,
    notificacion_email,
    notificacion_inapp
  )
  values (
    new.email,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    100, -- RF14: 100 puntos de bienvenida
    0,
    5.0,
    true,
    true
  )
  on conflict (email) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Conectar el trigger a los registros de Supabase
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
