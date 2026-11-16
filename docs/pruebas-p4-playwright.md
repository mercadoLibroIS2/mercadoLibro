# Pruebas API Playwright — P4: Intercambios

## Objetivo y alcance

La suite [`frontend/e2e/p4-exchanges.spec.ts`](../frontend/e2e/p4-exchanges.spec.ts) verifica contra el backend Java real el ciclo de vida de los intercambios:

- Creación de propuestas entre dos usuarios.
- Cálculo de compensación por diferencia de valor de referencia.
- Reserva y liberación de puntos.
- Aceptación, confirmación y finalización.
- Cancelación, reintento y publicaciones nuevamente disponibles.
- Listados enviados/recibidos y consulta de estado.
- Autorización, validaciones y transiciones inválidas.

Usa `APIRequestContext` de Playwright. No abre Next.js, no intercepta respuestas y no limpia automáticamente los datos creados.

## Preparación y ejecución

1. Usar una base de datos exclusiva de pruebas. Cada ejecución crea usuarios, publicaciones e intercambios persistentes.
2. Iniciar el backend:

   ```bash
   cd ingenieriaSoftware2
   ./mvnw spring-boot:run
   ```

3. Confirmar disponibilidad:

   ```bash
   curl http://127.0.0.1:8086/api/test/ping
   ```

4. Ejecutar desde `frontend`:

   ```bash
   P4_API_URL=http://127.0.0.1:8086 npm run test:e2e:p4
   ```

`frontend/playwright.config.ts` exige `P4_API_URL` o `PLAYWRIGHT_BASE_URL` y no inicia un servidor web.

## Datos y variables

Por defecto se publican:

- `P4_ISBN_MENOR=978-84-376-0457-2`
- `P4_ISBN_MAYOR=978-987-566-646-7`

Se pueden reemplazar mediante variables de entorno:

```bash
P4_API_URL=http://127.0.0.1:8086 \
P4_ISBN_MENOR=978-84-376-0457-2 \
P4_ISBN_MAYOR=978-987-566-646-7 \
npm run test:e2e:p4
```

Los dos ISBN deben producir valores de referencia distintos con estado `NUEVO`, y la diferencia debe ser como máximo 500 puntos para los escenarios normales.

El caso opcional de saldo insuficiente se activa con `P4_ISBN_SALDO_INSUFICIENTE`. Ese ISBN debe tener una diferencia superior a los 500 puntos iniciales:

```bash
P4_API_URL=http://127.0.0.1:8086 \
P4_ISBN_SALDO_INSUFICIENTE=<ISBN_DE_ALTO_VALOR> \
npm run test:e2e:p4
```

## Contrato verificado

| Endpoint | Operación | Resultado esperado |
|---|---|---|
| `POST /api/auth/registro` | Crear usuarios de prueba | HTTP 201 y 500 puntos iniciales |
| `POST /api/publicaciones/publicar` | Crear publicaciones | HTTP 201 y `PublicacionResponseDTO` con `publicacionId` |
| `POST /api/intercambios` | Proponer intercambio | HTTP 201 y `IntercambioResponseDTO` pendiente |
| `GET /api/intercambios/enviados` | Listar propuestas propias | HTTP 200 |
| `GET /api/intercambios/recibidos` | Listar propuestas recibidas | HTTP 200 |
| `GET /api/intercambios/estado` | Consultar estado por ID compuesto | HTTP 200 |
| `PATCH /api/intercambios/aceptar` | Aceptar propuesta | HTTP 200 |
| `PATCH /api/intercambios/completar` | Confirmar por cada participante | HTTP 200 |
| `PATCH /api/intercambios/cancelar` | Cancelar propuesta | HTTP 200 |
| `GET /api/movimientoPuntos/saldo` | Comprobar reservas y pagos | HTTP 200 |
| `GET /api/movimientoPuntos/historial` | Comprobar movimientos | HTTP 200 |

Las operaciones de estado usan el identificador compuesto de las dos publicaciones: ISBN, propietario y hora de publicación.

## Casos cubiertos

| ID | Caso | Verificaciones principales |
|---|---|---|
| P4-INT-01 | Propuesta con compensación del proponente | Calcula la diferencia, reserva al proponer y aparece en enviados/recibidos como pendiente. |
| P4-INT-02 | Compensación del receptor | No reserva al proponer; el receptor queda reservado al aceptar. |
| P4-INT-03 | Aceptación y finalización | Recorre aceptado, primera confirmación y completado; verifica pagos, bonos, saldos e historial. |
| P4-INT-04 | Cancelación pendiente y reintento | Libera la reserva, registra `LIBERACION_RESERVA` y permite una nueva propuesta. |
| P4-INT-05 | Cancelación después de aceptar | Libera puntos, devuelve disponibilidad y permite crear otra propuesta. |
| P4-INT-06 | Diferencia cero | Acepta el intercambio sin reservar puntos. |
| P4-INT-07 | Autorización y transición inválida | Solo el receptor acepta; no se puede aceptar nuevamente un intercambio aceptado. |
| P4-INT-08 | Listados y estados | Enviados y recibidos reflejan pendiente, aceptado y cancelado. |
| P4-INT-09 | Autenticación y propuesta propia | Rechaza solicitudes sin JWT, publicaciones del mismo propietario y listados sin autenticar. |
| P4-INT-10 | Publicación no disponible y cancelación repetida | Rechaza una nueva propuesta sobre publicaciones reservadas y una segunda cancelación. |
| P4-INT-11 | DTO incompleto | HTTP 400 sin modificar saldo ni crear intercambio. |
| P4-INT-12 | Saldo insuficiente | Caso opcional; rechaza una compensación superior al saldo y evita mutación parcial. |

## Resultado y limitaciones

Con los ISBN predeterminados, se ejecutan 11 casos y P4-INT-12 queda omitido porque requiere configurar un ISBN adicional de alto valor. La suite no ejecuta `reset-and-init-schema`, no borra datos persistentes y no cubre compras, intercambios en cadena ni reseñas.

Los reportes de Playwright quedan en `test-results/` y `playwright-report/`, excluidos de Git.
