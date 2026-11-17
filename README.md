# MercadoLibro

Plataforma de intercambio de libros entre lectores (Ingeniería de Software II). Cada usuario
publica ejemplares y los intercambia por **puntos** o en **trueque directo**; el sistema además
detecta **cadenas circulares** de 3 a 5 lectores a partir de los libros que cada uno sigue.

## Arquitectura

```
frontend/ (Next.js)  ──HTTP + JWT──▶  ingenieriaSoftware2/ (Spring Boot 4, Java 21)  ──JDBC──▶  PostgreSQL (Supabase)
                                                                                     └──▶  H2 en memoria/archivo (local)
```

- **Frontend** (`frontend/`): Next.js + React + Tailwind. Toda la lógica de negocio pasa por el backend.
- **Backend** (`ingenieriaSoftware2/`): API REST con Spring Security (JWT), JPA y Google Books / Open Library
  para los datos de los libros.
- **Base de datos**: Supabase (PostgreSQL) en producción; H2 para desarrollo local.

## Requisitos

- Java 21 (el repo incluye Maven Wrapper: `./mvnw`)
- Node 22 y pnpm

## Levantar en local

**Backend** (puerto 8086, H2 en memoria por defecto):

```bash
cd ingenieriaSoftware2
./mvnw spring-boot:run
```

**Frontend** (puerto 3000):

```bash
cd frontend
pnpm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:8086 pnpm dev
```

Con H2 la tabla `libro` arranca vacía: el primer usuario que publica un ISBN lo importa desde Google Books
(requiere `GOOGLE_BOOKS_API_KEY`; si no responde, se intenta Open Library).

## Variables de entorno

Backend (ver también `.env.example`):

| Variable | Para qué | Default |
|---|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Conexión a la base | H2 en memoria |
| `JWT_SECRET` | Firma de los tokens. **Obligatoria en producción** (el default está en el repo) | valor de desarrollo |
| `GOOGLE_BOOKS_API_KEY` | Metadatos de libros | vacía |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | En producción no usar `update`: el esquema se aplica con `schema.sql` | `update` |
| `APP_DEBUG_ENDPOINTS` | Habilita `/api/test/*` de diagnóstico (incluye borrar la base). **Nunca en producción** | `false` |
| `PORT` | Puerto HTTP (Render lo asigna) | `8086` |

Frontend: `NEXT_PUBLIC_BACKEND_URL` (URL del backend; ver `frontend/.env.example`).

## Base de datos (Supabase)

El esquema de producción está en `ingenieriaSoftware2/src/main/resources/schema.sql` y se aplica a mano
desde el SQL Editor de Supabase. Todas las sentencias son idempotentes (`IF NOT EXISTS`), así que se puede
volver a correr completo después de cada cambio de modelo. Tablas nuevas que no lee el frontend
(por ejemplo `cadena_paso`, `resenia_compra`) conviene dejarlas con RLS activado y sin políticas: el
backend entra como dueño de las tablas y no se ve afectado.

## Tests

```bash
# Backend: unitarios + contexto
cd ingenieriaSoftware2 && ./mvnw test

# Frontend: E2E de interfaz (levantan Next.js solos y simulan el backend)
cd frontend
pnpm test:e2e:p1   # usuarios y sesión
pnpm test:e2e:p2   # publicaciones
pnpm test:e2e:p5   # catálogo, Google Books y cadenas
pnpm test:e2e:p6   # notificaciones y reseñas

# E2E contra la API real (usar una base exclusiva de pruebas: crean datos)
P3_API_URL=http://localhost:8086 pnpm test:e2e:p3   # puntos
P4_API_URL=http://localhost:8086 pnpm test:e2e:p4   # intercambios
```

Si Chromium no está instalado: `npx playwright install chromium`. P4 necesita en la tabla `libro` los ISBN
`978-84-376-0457-2` y `978-987-566-646-7` con distinto valor de referencia (ver `docs/pruebas-p4-playwright.md`).
El detalle de cada suite está en `docs/`. La colección de Postman está en `postman/`.

## Despliegue

- **Backend**: Render, con el `Dockerfile` de `ingenieriaSoftware2/`. Definir las variables de la tabla
  anterior (en especial `JWT_SECRET` y la conexión a Supabase).
- **Frontend**: Vercel, con `NEXT_PUBLIC_BACKEND_URL` apuntando al backend de Render.
- Antes de desplegar cambios de modelo, aplicar `schema.sql` en Supabase.

## Estructura

```
frontend/
  components/mercado/   pantallas y componentes (store.tsx concentra el estado y las llamadas a la API)
  lib/                  cliente de la API (api.ts), tipos y utilidades
  e2e/                  suites Playwright p1–p6
ingenieriaSoftware2/src/main/java/com/ingenieriaSoftware2/
  Controller/  Service/  Repository/  Entity/  DTO/  Mapper/  Security/
docs/        documentación de las pruebas
postman/     colección de pruebas de la API
```
