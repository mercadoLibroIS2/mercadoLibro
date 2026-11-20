# Demo con la rama unificada (frontend de `dev` + backend Java)

Esta rama toma `dev` como base y le suma lo que solo existía en `demo/deploy`:
reportes, panel de administración y datos de demo. Todo pasa por la API Java;
el frontend no escribe en Supabase.

El guion de 12 minutos de `demo/deploy` (`docs/demo-12-minutos.md` en esa rama)
usa datos y puntos exactos de su base de Supabase, así que no aplica tal cual.
Antes de presentar con esta rama, hay que ensayarlo y ajustarlo.

## Preparación

1. En el backend (Render), definí la variable `APP_ADMIN_EMAILS=admin@mercadolibro.demo`
   y redeployá. Las cuentas con esos emails reciben rol ADMINISTRADOR al arrancar
   o al registrarse.
2. Si la base es Postgres administrada a mano, corré `ingenieriaSoftware2/src/main/resources/schema.sql`
   (agrega la tabla `reporte` y el valor `REPORTE_ACTUALIZADO` de `tipo_notificacion`).
   Con `ddl-auto=update` la tabla también se crea sola.
3. Cargá los datos de demo (usuarios y publicaciones), desde `frontend/`:

   ```bash
   BACKEND_URL=https://mercadolibro.onrender.com node scripts/seed-demo.mjs
   ```

   Es idempotente. Todas las cuentas usan la contraseña `Demo2026!`:
   `admin@`, `lucia@`, `tomas@`, `valentina@` y `mateo@mercadolibro.demo`.
   El backend necesita `GOOGLE_BOOKS_API_KEY` para importar los libros por ISBN.

## Recorrido sugerido

1. **Catálogo y publicación** (Lucía): filtrar por categoría, publicar por ISBN con semáforo de precio.
2. **Trueque** (Lucía ↔ Tomás): proponer, aceptar, confirmar recepción de ambos lados, reseñar.
3. **Cadenas circulares**: con tres usuarios que se quieren libros en ronda, la cadena aparece
   en "Cadenas Circulares" y cada participante acepta su parte. Al aceptar todos, queda en intercambio
   y los libros se reservan. Cada lector confirma la recepción de su libro desde esa misma pantalla;
   la última recepción completa la cadena y acredita +50 puntos por persona.
4. **Reportes** (cualquier usuario):
   - Detalle de un libro ajeno → "Reportar publicación".
   - Perfil de otro usuario → "Reportar usuario".
   - Mis intercambios → bandera "Reportar" en la tarjeta.
5. **Administración** (`admin@mercadolibro.demo`): menú "Administración".
   - Reportes: marcar en revisión, descartar o resolver con una acción
     (cancelar intercambio, dar de baja la publicación, suspender usuario).
   - Quien reportó recibe una notificación con la resolución.
   - Cuentas suspendidas: no pueden entrar ni usar su sesión; se reactivan desde la pestaña.
   - Reportes generales: usuarios, publicaciones, puntos e intercambios por estado.

## Qué quedó afuera de `demo/deploy` a propósito

- Lectura y escritura directa a Supabase desde el frontend (`admin-db.ts`, `social-db.ts`,
  migraciones con RLS y funciones `security definer`): se reemplazó por endpoints Java.
- "Intercambios estancados": el intercambio no guarda fecha de última actualización en el
  modelo Java. Se puede sumar agregando ese campo.
- Script de reset por API de Supabase. Para empezar de cero, se vacía la base y se corre el seed.
