# Pruebas E2E Playwright — P3: Puntos

## Objetivo y alcance

`frontend/e2e/p3-points.spec.ts` prueba los endpoints reales del backend Spring Boot:

- `POST /api/auth/registro`, prerequisito de P1 y origen de los puntos de bienvenida.
- `GET /api/movimientoPuntos/saldo`.
- `GET /api/movimientoPuntos/historial`.

No se simulan las respuestas de puntos. Cada prueba registra usuarios únicos, usa el JWT que responde el backend y consulta el saldo y el historial asociados a esa sesión. La asignación inicial implementada en el backend es de **500 puntos**.

## Preparación y ejecución

Requiere el backend iniciado con una base de datos exclusiva de pruebas. La suite no tiene una URL predeterminada: hay que indicar `P3_API_URL` explícitamente. Desde `frontend`:

```bash
P3_API_URL=http://localhost:8086 npm run test:e2e:p3
```

Los tests crean usuarios persistentes con emails bajo `example.test`; ejecútalos solo contra una base de datos destinada a pruebas. Sin `P3_API_URL`, Playwright se detiene antes de iniciar las pruebas. No ejecutan reset de esquema ni requieren credenciales de base de datos en el navegador.

## Casos cubiertos

| ID | Caso | Verificaciones |
|---|---|---|
| P3-PTS-01 | Acreditación al registrarse | Registro exitoso, respuesta de autenticación con 500 puntos y saldo inicial de 500 total, 0 reservado y 500 disponible. |
| P3-PTS-02 | GET saldo | Estructura y tipos numéricos, valores no negativos y relación `total - reservado = disponible`. |
| P3-PTS-03 | GET historial | Existe exactamente un movimiento inicial positivo de 500, con tipo `INGRESO`, origen `ALTA_INICIAL` y fecha. |
| P3-PTS-04 | Acceso sin token | Ambos GET protegidos rechazan solicitudes sin JWT. |
| P3-PTS-05 | Registro duplicado | Un segundo registro con las mismas credenciales se rechaza con 409 y no duplica saldo ni movimiento. |
| P3-PTS-06 | Datos de registro inválidos | Nombre por debajo del mínimo, email inválido y contraseñas vacía/corta reciben 400. |
| P3-PTS-07 | Sesiones de usuarios distintos | Dos cuentas distintas pueden consultar saldo e historial con sus propios JWT. |

La interfaz Next.js muestra un saldo de demostración independiente del backend Java, por lo que estas pruebas apuntan deliberadamente a la API que implementa los GET solicitados y no atribuyen persistencia de backend a la UI.
