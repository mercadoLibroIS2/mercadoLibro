# Pruebas E2E Playwright — P1: Usuarios y seguridad

## Objetivo

Verificar los flujos de usuario implementados actualmente en el frontend:

- Registro contra el backend Java.
- Login por email o nombre de usuario.
- Validaciones locales y errores del backend.
- Perfil propio y edición del nombre.
- Cambio de contraseña.
- Persistencia segura de la sesión JWT.
- Logout local y remoto.

La suite está implementada en [`frontend/e2e/p1-auth.spec.ts`](../frontend/e2e/p1-auth.spec.ts). Intercepta las solicitudes REST del frontend y devuelve respuestas controladas; no crea usuarios ni modifica una base real.

## Ejecución

Desde `frontend`:

```bash
npm install
npm run test:e2e:p1
```

La configuración [`frontend/playwright.p1.config.ts`](../frontend/playwright.p1.config.ts) inicia automáticamente Next.js en `http://127.0.0.1:3100`. Si falta Chromium:

```bash
npx playwright install chromium
```

También se puede usar otra URL del frontend con `P1_APP_URL`.

## Casos cubiertos

| ID | Funcionalidad | Caso | Verificaciones principales |
|---|---|---|---|
| P1-AUTH-01 | Registro | Registro válido | Completa nombre, usuario, email y contraseña; envía `POST /api/auth/registro`; crea la sesión y muestra bienvenida. |
| P1-AUTH-02 | Registro | Validaciones locales | Rechaza email inválido, contraseña menor a 8 caracteres y confirmación diferente sin llamar al backend. |
| P1-AUTH-03 | Registro | Email ya registrado | Traduce el HTTP 409 del backend a un mensaje visible y no crea sesión. |
| P1-AUTH-04 | Login | Credenciales rechazadas y válidas | Un HTTP 401 no autentica; un login válido crea sesión y muestra la bienvenida. |
| P1-AUTH-05 | Login | Contraseña corta | Rechaza localmente una contraseña menor a 8 caracteres sin enviar la solicitud. |
| P1-AUTH-06 | Login | Error del backend | Informa un error HTTP 500 y mantiene la pantalla de login sin sesión. |
| P1-AUTH-07 | Perfil propio | Consulta del perfil autenticado | Muestra nombre, usuario y la marca «Tu Cuenta». |
| P1-AUTH-08 | Perfil propio | Edición de perfil | Envía el nuevo nombre a `PUT /api/usuario/me`, actualiza la vista y muestra confirmación. |
| P1-AUTH-09 | Seguridad de sesión | Estado local obsoleto | Un usuario guardado en `localStorage` no se considera autenticado si no existe un token JWT válido. |
| P1-AUTH-10 | Cambio de contraseña | Validación y actualización | Rechaza contraseña corta o confirmación diferente; con datos válidos envía `PUT /api/usuario/me/contrasenia`. |
| P1-AUTH-11 | Cambio de contraseña | Error del backend | Muestra el error remoto y mantiene abierto el diálogo. |
| P1-AUTH-12 | Logout | Cierre exitoso | Llama a `POST /api/auth/logout`, vuelve al login y elimina usuario y token locales. |
| P1-AUTH-13 | Logout | Falla remota | Aunque el backend responda HTTP 500, limpia la sesión local y vuelve al login. |

## Estrategia de simulación

La suite intercepta las rutas REST usadas por el store:

- `/api/auth/registro`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/usuario/me`
- `/api/usuario/me/contrasenia`
- `/api/movimientoPuntos/saldo`
- `/api/publicaciones/disponibles`

Las respuestas incluyen el contrato actual del backend: `AuthResponseDTO`, `PerfilResponseDTO`, saldos y códigos HTTP 200, 201, 204, 401, 409 y 500 según el caso. Las credenciales y tokens son datos ficticios definidos dentro de la prueba.

## Alcance y limitaciones

- Estas pruebas validan la interfaz, el store y su integración con el contrato REST simulado; no verifican la base de datos, JWT real, BCrypt, CORS ni autorización real del backend.
- El registro no prueba envío ni confirmación de email: el backend actual crea la sesión directamente.
- La edición de perfil actualiza localmente el store y dispara la petición REST sin esperar su resultado; el caso verifica ambas cosas según el comportamiento vigente.
- El cambio de contraseña verifica la solicitud y el tratamiento del resultado, no que la nueva contraseña pueda utilizarse después contra una instancia real.
- No se cubren usuarios públicos, seguimiento de libros ni operaciones de intercambio, porque pertenecen a otros planes P2-P6.

Los reportes y artefactos generados por Playwright quedan en `test-results/` y `playwright-report/`, excluidos de Git.
