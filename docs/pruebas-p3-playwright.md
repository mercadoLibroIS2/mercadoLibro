# Pruebas API Playwright — P3: Puntos

## Objetivo y alcance

La suite [`frontend/e2e/p3-points.spec.ts`](../frontend/e2e/p3-points.spec.ts) verifica contra el backend Java real:

- Acreditación de puntos al registrarse.
- Consulta de saldo actual.
- Consulta del historial de movimientos.
- Protección de los endpoints con JWT.
- Rechazo de registros duplicados e inválidos.
- Aislamiento del saldo e historial entre usuarios.

Esta suite usa `APIRequestContext` de Playwright. No abre el frontend Next.js, no intercepta respuestas y no usa mocks: las solicitudes se envían a la API configurada.

## Preparación y ejecución

1. Iniciar el backend desde `ingenieriaSoftware2`:

   ```bash
   ./mvnw spring-boot:run
   ```

2. Confirmar que responde en `http://127.0.0.1:8086`:

   ```bash
   curl http://127.0.0.1:8086/api/test/ping
   ```

3. Ejecutar la suite desde `frontend`, indicando explícitamente la URL:

   ```bash
   P3_API_URL=http://127.0.0.1:8086 npm run test:e2e:p3
   ```

`frontend/playwright.p3.config.ts` detiene la ejecución si no se define `P3_API_URL` ni `PLAYWRIGHT_BASE_URL`. No se inicia ningún `webServer` de Next.js.

La configuración local del backend usa H2 en memoria por defecto. Los usuarios creados por la suite son efímeros para esa ejecución; si se usa PostgreSQL o Supabase, debe ser una base exclusiva de pruebas. No ejecutar contra producción ni contra una base con datos relevantes.

## Contrato verificado

| Endpoint | Autenticación | Contrato comprobado |
|---|---|---|
| `POST /api/auth/registro` | Pública | HTTP 201, `AuthResponseDTO`, token y 500 puntos iniciales |
| `GET /api/movimientoPuntos/saldo` | Bearer JWT | `SaldoPuntosResponseDTO` con total, reservado y disponible |
| `GET /api/movimientoPuntos/historial` | Bearer JWT | Lista de `MovimientoPuntosResponseDTO` con tipo, monto, origen y fecha |

La implementación actual asigna `500` puntos, `0` reservados y `500` disponibles al registrarse. El primer movimiento tiene `tipo=INGRESO` y `origen=ALTA_INICIAL`.

## Casos cubiertos

| ID | Caso | Verificaciones |
|---|---|---|
| P3-PTS-01 | Acreditación inicial | El registro devuelve 500 puntos y el saldo queda en 500 total, 0 reservado y 500 disponible. |
| P3-PTS-02 | Consulta de saldo | Los tres valores son enteros no negativos y cumplen `saldoTotal - saldoReservado = saldoDisponible`. |
| P3-PTS-03 | Historial inicial | Existe exactamente un movimiento de alta, positivo, con origen y fecha. |
| P3-PTS-04 | Protección | Saldo e historial rechazan solicitudes sin JWT con HTTP 401 o 403. |
| P3-PTS-05 | Registro duplicado | El segundo registro devuelve HTTP 409 y no crea puntos ni movimientos adicionales. |
| P3-PTS-06 | Registro inválido | Nombre corto, email inválido y contraseñas inválidas devuelven HTTP 400 y `ValidationError`. |
| P3-PTS-07 | Aislamiento por usuario | Dos JWT distintos consultan sus propios saldos e historiales iniciales. |

## Limitaciones

- Los casos no cubren movimientos generados por compras, intercambios o reseñas; esos flujos pertenecen a P4-P6.
- La suite valida la API real, pero no la presentación del saldo en la interfaz Next.js. La integración visual con el store se cubre en los escenarios de frontend correspondientes.
- Cada usuario se crea durante la ejecución. La suite no borra registros al finalizar; con H2 en memoria desaparecen al detener el backend, pero con una base persistente deben limpiarse según el procedimiento del entorno.

Los reportes de Playwright quedan en `test-results/` y `playwright-report/`, excluidos de Git.
