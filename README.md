# mercadoLibro
Proyecto de Ingeniería de Software II; Plataforma de intercambio de libros

## Demo

- App: https://mercadolibro-demo.vercel.app
- Backend de búsqueda por ISBN (Google Books): https://mercadolibro-51uh.onrender.com
  (plan gratis: se duerme a los 15 min sin uso; la primera consulta tarda ~1 min)
- Guion paso a paso: https://claude.ai/artifact/DUBmyMU3hx4AmZmBbroxon

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

### Resetear los datos de la demo

Desde la carpeta `frontend` (con las dependencias instaladas):

```bash
node scripts/reset-demo.mjs   # elimina las publicaciones de demo y vuelve los saldos a 100
node scripts/seed-demo.mjs    # recrea publicaciones, saldos e intercambios iniciales
```

Después, en el navegador donde se va a hacer la demo, borrar los datos del sitio
(notificaciones, reseñas y tracker se guardan en `localStorage`).

### Correr el frontend en local

```bash
cd frontend
pnpm install   # o npm install
pnpm dev       # o npm run dev  → http://localhost:3000
```

No necesita `.env`: usa por defecto el proyecto de Supabase de la demo.
Si el backend no está corriendo, la búsqueda por ISBN usa Open Library como respaldo.

### Correr el backend en local (opcional)

- Requiere **Java 21** (con Java 24 Lombok no compila).
- Crear `.env` en la raíz a partir de `.env.example` y completar `GOOGLE_BOOKS_API_KEY`.
- `cd ingenieriaSoftware2 && ./mvnw spring-boot:run` → http://localhost:8086
