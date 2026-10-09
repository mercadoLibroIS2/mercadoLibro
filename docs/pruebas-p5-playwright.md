# Pruebas E2E Playwright — P5: Catálogo, Google Books y cadenas

## Ejecución

Desde `frontend`:

```bash
npm run test:e2e:p5
```

El comando levanta Next.js automáticamente en `http://127.0.0.1:3101`. Se puede definir otra URL con `P5_APP_URL`. Supabase Auth y REST se simulan con respuestas de prueba; no se usan cuentas ni datos remotos.

## Casos E2E del frontend actualmente implementado

La suite está en `frontend/e2e/p5-catalog-chains.spec.ts` y cubre:

| Área | Cobertura |
|---|---|
| Catálogo | Listado completo de libros semilla; búsqueda por título, autor e ISBN; filtros por categoría, estado y puntos; limpieza de filtros y estado vacío; ficha con metadatos y disponibilidad; autocomplete con mínimo de dos caracteres y exclusión de libros no disponibles. |
| Cadenas | Valida el ciclo cerrado de tres participantes, participantes únicos, libros entregados/recibidos y confirmaciones; muestra las cadenas solo a usuarios participantes; permite rechazo y cancelación; confirma participantes secuencialmente hasta completar; comprueba persistencia en `localStorage`; no muestra ciclos cuando una publicación necesaria no está disponible. |

Se ajustó la vista para filtrar cadenas por participación del usuario y se protegieron las acciones de confirmar/rechazar frente a usuarios no participantes, confirmaciones duplicadas y estados terminales.

## Limitación: integración de Google Books

No hay actualmente flujo de búsqueda contra Google Books en el frontend ni endpoints/servicios de Google Books en Spring Boot. El catálogo que se prueba está construido con datos semilla locales; el backend `LibroController` tampoco implementa operaciones de consulta. Por eso no es posible escribir pruebas E2E reales de búsqueda, metadatos, ISBN inexistente, límites/cuotas o errores de Google Books sin implementar primero esa integración. La suite verifica búsqueda local del catálogo por título/autor/ISBN, pero **no representa ni simula como implementada la integración externa**.

Las cadenas también son actualmente una función local de demostración: `generateInitialChains` construye un ciclo de tres usuarios semilla y el estado se guarda en `localStorage`. El backend no implementa detección, persistencia ni endpoints de cadenas; las pruebas de estados/acciones validan el comportamiento actual del frontend y no una cadena compartida entre sesiones o dispositivos.
