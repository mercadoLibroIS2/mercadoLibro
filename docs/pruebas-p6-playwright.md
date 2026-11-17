# Pruebas E2E Playwright — P6: Notificaciones y reseñas

## Alcance

La suite está en `frontend/e2e/p6-notifications-reviews.spec.ts` y separa
dos capas:

1. **Frontend determinista**: valida la experiencia de usuarios demo con el
   estado local de la store y mocks explícitos de los endpoints REST.
2. **Contratos REST opcionales**: valida contra Spring Boot los endpoints
   actuales de notificaciones y reseñas cuando se define `P6_API_URL`.

La store sincroniza datos backend para usuarios reales, pero conserva estado
local para las cuentas demo usadas por los escenarios visuales. Por eso no se
mezclan ambas capas en los mismos casos.

## Ejecución

Desde `frontend/`:

```bash
npm run test:e2e:p6
```

El comando levanta Next.js en `http://127.0.0.1:3102`. Se puede cambiar la
URL con `P6_APP_URL`. No hace falta iniciar Spring Boot para los escenarios
frontend.

Para ejecutar también los contratos REST:

1. Iniciar el backend en `http://127.0.0.1:8086`.
2. Ejecutar:

```bash
P6_API_URL=http://127.0.0.1:8086 npm run test:e2e:p6
```

Los casos REST registran usuarios con nombres y emails únicos. Si
`P6_API_URL` no está definido, esos casos quedan omitidos.

## Cobertura frontend

| Área | Escenarios |
|---|---|
| Notificaciones | Aislamiento por usuario; badge de no leídas no archivadas; marcar una al abrirla; marcar todas; archivar con persistencia; estado vacío; navegación a intercambios; notificación generada al aceptar una solicitud y visible para el solicitante. |
| Reseñas | Crear una reseña de un intercambio completado; calificaciones de 1 a 5; comentario obligatorio y trim de espacios; omitir; impedir reseñar intercambios cancelados; evitar duplicados; actualizar reputación, historial, puntos y perfil público. |
| Contrato mockeado | `GET /api/notificacion` devuelve una página Spring (`content`, `totalElements`, etc.); mutaciones de notificaciones responden `204`; `POST /api/resenia` responde `201`. |

## Cobertura REST

Los casos opcionales verifican:

- `GET /api/notificacion?soloNoLeidas=false`.
- `GET /api/notificacion/no-leidas/count`.
- `PATCH /api/notificacion/marcar-todas`.
- Protección de una notificación inexistente mediante `404`.
- `GET /api/resenia` y `GET /api/resenia/usuario/{email}`.
- Rechazo de una calificación fuera del rango 1–5 con `400`.

Las operaciones de notificaciones están implementadas en
`NotificacionController` y `NotificacionServiceImpl`. Las reseñas se crean
con `POST /api/resenia`; el servicio valida que el intercambio esté
completado, evita duplicados, actualiza reputación y acredita la recompensa.

## Diferencia entre demo frontend y backend

La UI demo acredita actualmente **+5 puntos** al publicar una reseña. El
servicio Java acredita **50 puntos** (`puntosResenia`). La suite documenta y
valida cada comportamiento en su propia capa; esta diferencia debe resolverse
si ambos flujos deben ofrecer el mismo valor.

La suite no crea un intercambio completado real para probar el ciclo completo
de `POST /api/resenia`, porque ese flujo requiere preparar publicaciones e
intercambios con identificadores compuestos. Sí cubre la creación completa
desde la UI demo y valida los listados y errores básicos del contrato REST.
