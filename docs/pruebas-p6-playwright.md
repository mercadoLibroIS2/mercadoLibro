# Pruebas E2E P6: Notificaciones y reseñas

## Ejecución

Desde `frontend/`:

```bash
npm run test:e2e:p6
```

La suite levanta Next.js en el puerto `3102`, simula Supabase Auth/REST y usa estado semilla aislado por prueba. Se puede cambiar la URL con `P6_APP_URL`.

## Cobertura frontend

- Visibilidad de notificaciones por usuario, contador de no leídas y exclusión de avisos archivados.
- Marcar una notificación al abrirla, marcar todas las del usuario, archivar y presentar el estado vacío.
- Aparición de una notificación para el solicitante después de que el dueño acepta un intercambio.
- Crear una reseña en un intercambio completado, validar calificaciones mínima y media, exigir un comentario no vacío y permitir omitirla.
- Evitar calificar de nuevo el mismo intercambio, otorgar los puntos una sola vez y reflejar la calificación/reseña en el perfil público.
- Impedir reseñar un intercambio cancelado.

## Límites de integración backend

Estas pruebas ejercitan la aplicación frontend con persistencia local; no verifican llamadas contra la API Java. En el backend actual, `NotificacionController` y `NotificacionService` están vacíos y no se encontraron listeners de eventos implementados. La API de reseñas expone creación (`POST /api/resenia`), pero no un GET de reseñas; el perfil por usuario devuelve reputación promedio, no el listado de reseñas. Por ello, los endpoints/listeners de notificaciones y el GET de reseñas/reputación integrados requieren completar esos contratos backend antes de poder cubrirse como E2E API.
