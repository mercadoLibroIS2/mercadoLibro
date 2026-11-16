-- Réplica mínima del entorno de Supabase + tablas creadas por Hibernate.
create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.role() returns text language sql stable as $$ select auth.jwt() ->> 'role' $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
grant execute on all functions in schema auth to anon, authenticated;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  encrypted_password text default 'hash',
  raw_user_meta_data jsonb default '{}'
);

create type rol as enum ('USUARIO', 'ADMINISTRADOR');
create type estado_fisico as enum ('NUEVO', 'COMO_NUEVO', 'BUEN_ESTADO', 'ACEPTABLE', 'DETERIORADO');
create type estado_publicacion as enum ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ELIMINADA');
create type color_semaforo as enum ('VERDE', 'AMARILLO', 'ROJO', 'SIN_REFERENCIA');

create table public.usuario (
  id uuid unique not null,
  email varchar(255) primary key,
  nombre varchar(255) unique not null,
  contrasenia varchar(255) not null,
  saldo_total integer,
  saldo_reservado integer,
  reputacion_promedio real,
  rol rol default 'USUARIO',
  es_activo boolean
);
create table public.libro (
  isbn varchar(255) primary key,
  google_books_id varchar(255) unique,
  titulo varchar(255),
  autores varchar(255),
  puntuacion_externa numeric,
  valor_referencia integer,
  fecha_cache_bibliografico timestamp,
  fecha_cache_puntuacion timestamp
);
create table public.categoria (
  nombre varchar(255) primary key,
  categoria_padre_id varchar(255) references public.categoria(nombre)
);
create table public.libro_categoria (
  isbn varchar(255) not null references public.libro(isbn),
  nombre_categoria varchar(255) not null references public.categoria(nombre),
  primary key (isbn, nombre_categoria)
);
create table public.publicacion (
  isbn varchar(255) not null references public.libro(isbn),
  email_propietario varchar(255) not null references public.usuario(email),
  hora_publicacion timestamp not null,
  estado_fisico estado_fisico,
  valor_puntos_solicitado integer,
  valor_referencia_calculado integer,
  comentario varchar(255),
  estado_publicacion estado_publicacion default 'DISPONIBLE',
  color_semaforo color_semaforo default 'SIN_REFERENCIA',
  primary key (isbn, email_propietario, hora_publicacion)
);

-- Privilegios por defecto de Supabase sobre el esquema public.
grant all on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
