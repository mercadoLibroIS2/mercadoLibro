# Supabase local para MercadoLibro

Este proyecto levanta Supabase local en Docker. No requiere enlazar el CLI con un proyecto remoto y no ejecuta cambios en Supabase Cloud.

## Requisitos

- Docker Desktop iniciado.
- Node.js/Corepack.

## Iniciar

Desde la raíz del repositorio:

```sh
corepack pnpm dlx supabase start
```

El primer inicio descarga las imágenes de Docker. El esquema completo documentado se aplica desde `migrations/`; `seed.sql` carga categorías y un registro bibliográfico ficticio exclusivo para probar P2 antes de que P5 conecte Google Books. No es un libro real ni debe llevarse al entorno remoto.

Obtén la URL y la clave pública locales:

```sh
corepack pnpm dlx supabase status
```

Copia `frontend/.env.local.example` a `frontend/.env.local`, configura `NEXT_PUBLIC_SUPABASE_URL` como `http://127.0.0.1:54321` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la clave `anon`/publishable que muestra el estado local. No uses una service-role key en el navegador. Reinicia Next.js después de cambiar el archivo.

- App: <http://localhost:3000>
- Supabase Studio: <http://127.0.0.1:54323>
- API local: <http://127.0.0.1:54321>
- PostgreSQL local: `localhost:54322`

Para apagar los contenedores sin borrar los datos:

```sh
corepack pnpm dlx supabase stop
```

Para reconstruir desde cero **la base local** y reaplicar migraciones/seed:

```sh
corepack pnpm dlx supabase db reset
```

El reset elimina los datos guardados en la instancia local. No ejecutar `supabase link`, `db push` ni comandos remotos para este flujo.

## Autenticación y publicaciones

Crear una cuenta desde la aplicación crea su fila `usuario` mediante el trigger local y registra el alta inicial según el modelo. La migración habilita RLS. En P2, `libro_metadata_cache` y categorías son de lectura; las publicaciones visibles públicamente son `DISPONIBLE` o `RESERVADA`; insertar requiere que el email del propietario coincida con el JWT; y actualizar requiere propietario y estado previo `DISPONIBLE`. No se permite borrado físico de publicaciones.

P2 solo deja elegir un ISBN que ya exista en `libro_metadata_cache`. La búsqueda/importación real desde Google Books pertenece a P5; el único registro inicial es un fixture ficticio local para ensayar alta, edición, listado y baja lógica de publicaciones.

El SQL implementa el modelo descrito en el PDF de documentación de la base de datos. El PDF enumera la lógica de funciones y triggers, pero no incluye el DDL original ni todas las políticas RLS. También describe la clave de `cadena` con solo una terna por intercambio, aunque `intercambio` tiene dos ternas; la migración usa ambas claves compuestas completas para conservar las dos referencias y el chequeo de continuidad descrito. Las políticas son locales y están limitadas a lectura del perfil propio y P2; P2 no tiene permisos para actualizar `usuario`. El resto de tablas tiene RLS activado sin políticas de acceso de aplicación hasta que se implemente cada fase funcional.
