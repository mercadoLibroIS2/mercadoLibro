# mercadoLibro
Proyecto de Ingeniería de Software II; Plataforma de intercambio de libros

## Demo

- App: https://mercadolibro-demo.vercel.app
- Backend de búsqueda por ISBN (Google Books): https://mercadolibro-51uh.onrender.com
  (plan gratis: se duerme a los 15 min sin uso; la primera consulta tarda ~1 min)
- Guion paso a paso: [demo de 12 minutos](docs/demo-12-minutos.md) (dos ventanas, flujo común, errores
  del usuario y trueque directo) y [versión larga de 25 minutos](docs/demo-version-larga.md) (registro,
  reportes y panel de administración). Copia editable: https://claude.ai/artifact/DUBmyMU3hx4AmZmBbroxon

Usuarios de demo (contraseña `Demo2026!` para todos):

| Usuario | Email | Puntos al empezar |
| --- | --- | --- |
| Lucía Fernández | `lucia@mercadolibro.demo` | 70 |
| Tomás Rivero | `tomas@mercadolibro.demo` | 100 |
| Mateo Gómez | `mateo@mercadolibro.demo` | 40 (+60 en garantía) |
| Valentina Sosa | `valentina@mercadolibro.demo` | 150 |

**Importante:** la app deployada y cualquier copia local usan la misma base de Supabase.
Si alguien hace la demo, los intercambios quedan hechos para todos. No ensayen dos personas
a la vez y reseteen los datos antes de cada ensayo.

### Migraciones de Supabase (obligatorio antes de la demo)

Correr **en orden** en el SQL Editor del proyecto de Supabase (ambas son idempotentes):

1. `frontend/supabase/migrations/20261114120000_seguridad_y_persistencia.sql`
   - Cierra la lectura anónima de `usuario` (hoy cualquiera puede leer emails y hashes de contraseña)
     y que un usuario se edite su propio saldo.
   - Persiste reseñas, reputación, historial de movimientos de puntos, notificaciones, seguimiento de
     libros (con aviso automático al publicarse uno que coincide) y el perfil editable.
   - Regla: un intercambio se completa cuando confirman **las dos partes**.
2. `frontend/supabase/migrations/20261116120000_categorias_reportes_admin.sql`
   - Categorías de libros (se eligen al publicar y se sugieren desde Google Books).
   - Reportes de usuarios, publicaciones e intercambios, panel de administración, gestión de
     conflictos (cancelar intercambios devolviendo puntos, dar de baja publicaciones, suspender cuentas).

Para dar acceso al panel de administración a una cuenta:

```sql
update public.usuario set rol = 'ADMINISTRADOR' where email = 'alguien@ejemplo.com';
```

Las migraciones se prueban con 55 verificaciones sobre Postgres embebido (RLS, roles y
flujos completos de intercambio, reseñas, seguimiento, reportes y administración):
`cd frontend/supabase/tests && npm install && npm test`.

### Resetear los datos de la demo

Desde la carpeta `frontend` (con las dependencias instaladas):

```bash
node scripts/reset-demo.mjs   # elimina las publicaciones de demo y vuelve los saldos a 100
node scripts/seed-demo.mjs    # recrea publicaciones, saldos e intercambios iniciales
```

`reset-demo.mjs` necesita la migración 1 aplicada. Con las migraciones aplicadas, notificaciones,
reseñas, movimientos y tracker quedan en la base; igual conviene borrar los datos del sitio en el
navegador de la demo para limpiar restos de sesiones anteriores.

### Correr el frontend en local

```bash
cd frontend
pnpm install   # o npm install
pnpm dev       # o npm run dev  → http://localhost:3000
```

No necesita `.env`: usa por defecto el proyecto de Supabase de la demo.
Si el backend no está corriendo, la búsqueda por ISBN usa Open Library como respaldo.

### Correr el backend en local (opcional)

- Requiere **Java 21 o superior** (Lombok 1.18.38).
- Crear `.env` en la raíz a partir de `.env.example` y completar `GOOGLE_BOOKS_API_KEY`.
- `cd ingenieriaSoftware2 && ./mvnw spring-boot:run` → http://localhost:8086
