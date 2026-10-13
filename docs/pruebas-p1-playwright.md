# Pruebas E2E Playwright — P1: Usuarios y seguridad

## Objetivo

Documentar las pruebas automatizadas de interfaz para el alcance P1:

- Registro de usuarios.
- Login.
- Logout.
- Cambio de contraseña.
- Visualización del perfil propio.

Las pruebas están implementadas en `frontend/e2e/p1-auth.spec.ts`. Playwright intercepta y simula las respuestas de Supabase Auth y REST; no se conecta al proyecto Supabase real, no crea usuarios reales y no requiere la contraseña de la base de datos ni credenciales de Supabase.

## Ejecución

Desde la carpeta `frontend`:

```bash
npm run test:e2e
```

Playwright inicia automáticamente el servidor de desarrollo en `http://127.0.0.1:3100`. Si falta el navegador Chromium en el entorno, instalarlo una vez con:

```bash
npx playwright install chromium
```

La ejecución produce resultados en la terminal. Los artefactos de Playwright, incluidos `test-results/` y `playwright-report/`, están excluidos de Git.

## Casos cubiertos

| ID | Funcionalidad | Caso | Verificaciones principales |
|---|---|---|---|
| P1-AUTH-01 | Registro | Registro exitoso con confirmación de email | Valida campos obligatorios, envía email y contraseña a Supabase Auth y muestra el mensaje para revisar el correo de confirmación. |
| P1-AUTH-02 | Registro | Rechazo de datos inválidos | Email inválido, contraseña de menos de seis caracteres y confirmación distinta muestran sus errores; no se envía una solicitud de registro. |
| P1-AUTH-03 | Registro | Email ya registrado | Simula el rechazo de Supabase para una cuenta existente y verifica el mensaje de error correspondiente. |
| P1-AUTH-04 | Login | Credenciales rechazadas, acceso demo bloqueado y login exitoso | Credenciales inválidas no autentican; la contraseña demo tampoco permite entrar; credenciales válidas de Supabase sí activan la sesión. |
| P1-AUTH-05 | Login | Formato de email inválido | El formulario informa el email inválido y no llama a Supabase. |
| P1-AUTH-06 | Login | Error del servicio de autenticación | Ante un error de Supabase, la interfaz informa el problema y no crea una sesión local. |
| P1-AUTH-07 | Perfil propio | Consulta del perfil propio autenticado | Luego de autenticar, permite abrir el perfil y muestra el nombre, usuario y marca «Tu Cuenta». |
| P1-AUTH-08 | Seguridad de sesión | Estado local obsoleto sin sesión Supabase | Un usuario presente en el estado persistido del navegador no aparece autenticado si Supabase no devuelve una sesión. |
| P1-AUTH-09 | Cambio de contraseña | Validación y actualización exitosa | Rechaza contraseñas cortas y confirmaciones diferentes; con datos válidos envía la actualización a Supabase y muestra éxito. |
| P1-AUTH-10 | Cambio de contraseña | Supabase rechaza la actualización | Informa el error remoto y mantiene abierto el diálogo para que el usuario pueda corregir o reintentar. |
| P1-AUTH-11 | Logout | Cierre global exitoso | Solicita el cierre global a Supabase, vuelve a login, limpia el usuario persistido y elimina el token de Auth local. |
| P1-AUTH-12 | Logout | Falla el cierre global | Verifica el fallback al cierre local, la limpieza del token y el aviso de que no se pudo confirmar el cierre en otros dispositivos. |
| P1-AUTH-13 | Logout | Fallan el cierre global y el manejo de sesión local | Verifica que se informe el fallo y que la interfaz no simule un logout exitoso: el usuario permanece autenticado. |

## Estrategia de simulación

La suite reemplaza las respuestas de estos servicios:

- Supabase Auth (`/auth/v1/signup`, `/auth/v1/token`, `/auth/v1/user` y `/auth/v1/logout`).
- Supabase REST (`/rest/v1/*`), que devuelve colecciones vacías para que la prueba no dependa de tablas existentes.

La cuenta y los tokens usados son datos ficticios definidos dentro de la prueba. No se guardan credenciales reales ni se efectúan cambios en Supabase.

## Alcance y limitaciones

- Estos casos comprueban las interacciones del frontend y el contrato esperado con Supabase simulado; no verifican conectividad, configuración, políticas, plantillas de email ni persistencia del proyecto Supabase real.
- El registro simula la respuesta que requiere confirmación de email. No se prueba el enlace real de confirmación.
- El cambio de contraseña simula la respuesta de Auth; no valida que la contraseña nueva se pueda usar después contra el servicio real.
- El perfil propio se construye con el usuario autenticado y datos simulados; no valida autorización o reglas RLS sobre la base de datos real.
- El backend conserva endpoints protegidos con JWT propios. Estas pruebas cubren autenticación P1 en el frontend con Supabase, no la migración ni autorización del backend.
- Los trece casos están escritos y Playwright los descubre. **No se han ejecutado**; por tanto, no se afirma que estén pasando en un navegador.
